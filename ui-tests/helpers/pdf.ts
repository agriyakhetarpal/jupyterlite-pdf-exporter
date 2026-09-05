// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import { PDFiumLibrary } from '@hyzyla/pdfium';
import type { PDFiumPage } from '@hyzyla/pdfium';

import { PNG } from 'pngjs';

/**
 * The result of analysing a PDF with analysePdf. Contains the page count, text,
 * PNGs and size of the first page.
 */
export interface IPdfAnalysis {
  pageCount: number;
  /** Text of every page */
  text: string;
  /** A PNG render of each page */
  pages: Buffer[];
  /** Size in points */
  width: number;
  height: number;
}

/**
 * The scale at which pages are rasterised. At 2.5, an A4 page is roughly
 * 1490 by 2100 pixels and a typical page is under 100 KiB as a PNG.
 */
export const RENDER_SCALE = 2.5;

/**
 * Initialise PDFium.
 */
let libraryPromise: Promise<PDFiumLibrary> | null = null;

function library(): Promise<PDFiumLibrary> {
  libraryPromise ??= PDFiumLibrary.init();
  return libraryPromise;
}

/**
 * Rasterise a page to a PNG at the given scale.
 */
async function renderPng(page: PDFiumPage, scale: number): Promise<Buffer> {
  const { data, width, height } = await page.render({
    scale,
    render: 'bitmap'
  });
  const png = new PNG({ width, height });
  png.data = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return PNG.sync.write(png);
}

/**
 * Read a PDF with PDFium.
 */
export async function analysePdf(
  pdf: Buffer,
  scale = RENDER_SCALE
): Promise<IPdfAnalysis> {
  const document = await (await library()).loadDocument(pdf);
  try {
    const texts: string[] = [];
    const pages: Buffer[] = [];
    let width = 0;
    let height = 0;

    // The wrapper closes a page after rendering it. We take a
    // fresh page object for each render
    for (let index = 0; index < document.getPageCount(); index++) {
      texts.push(document.getPage(index).getText().replace(/\s+/g, ' ').trim());
      if (index === 0) {
        const size = document.getPage(index).getOriginalSize();
        width = Math.round(size.originalWidth);
        height = Math.round(size.originalHeight);
      }
      pages.push(await renderPng(document.getPage(index), scale));
    }

    return {
      pageCount: document.getPageCount(),
      text: texts.join('\n\n'),
      pages,
      width,
      height
    };
  } finally {
    document.destroy();
  }
}
