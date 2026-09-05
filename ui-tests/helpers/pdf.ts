// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import * as fs from 'fs';
import * as path from 'path';

import type { BrowserContext } from '@playwright/test';

/**
 * A helper to join parts of a path relative to the pdfjs-dist package
 * @param parts Path segments to join
 * @returns The resolved path to the file
 */
function pdfjsFile(...parts: string[]): string {
  return path.join(
    path.dirname(require.resolve('pdfjs-dist/package.json')),
    ...parts
  );
}

/**
 * The result of analysing a PDF with analysePdf. Contains the page count, text,
 * PNGs and size of the first page.
 */
export interface IPdfAnalysis {
  pageCount: number;
  /** Text of every page */
  text: string;
  /** A PNG render of each page, at the report scale */
  pages: Buffer[];
  /** A PNG render of each page, at the (smaller) snapshot scale */
  snapshots: Buffer[];
  /** Size in points */
  width: number;
  height: number;
}

/**
 * Scales at which we rasterise the pages. We have a pretty crisp scale for
 * the previews, OTOH, the reference snapshots are committed to the repo
 * and I want to keep their size manageable. So we use a smaller one for them.
 * Reference: at 1.5, an A4 page is roughly 900 by 1260 pixels
 */
export const REPORT_SCALE = 2.5;
export const SNAPSHOT_SCALE = 1.5;

/**
 * Read a PDF with pdf.js
 */
export async function analysePdf(
  context: BrowserContext,
  pdf: Buffer,
  scales: { report: number; snapshot: number } = {
    report: REPORT_SCALE,
    snapshot: SNAPSHOT_SCALE
  }
): Promise<IPdfAnalysis> {
  const libSource = fs.readFileSync(
    pdfjsFile('legacy', 'build', 'pdf.mjs'),
    'utf8'
  );
  const workerSource = fs.readFileSync(
    pdfjsFile('legacy', 'build', 'pdf.worker.mjs'),
    'utf8'
  );

  const page = await context.newPage();
  try {
    await page.goto('about:blank');

    const result = await page.evaluate(
      async ({ libSource, workerSource, data, scales }) => {
        const toUrl = (source: string) =>
          URL.createObjectURL(
            new Blob([source], { type: 'application/javascript' })
          );

        const pdfjsLib = (await import(
          /* webpackIgnore: true */ toUrl(libSource)
        )) as typeof import('pdfjs-dist');
        // N.B. Must point somewhere, or PDFWorker.create throws on an opaque
        // origin. Spawning then fails and pdf.js parses on the main thread
        pdfjsLib.GlobalWorkerOptions.workerSrc = toUrl(workerSource);

        const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
        const doc = await pdfjsLib.getDocument({ data: bytes, verbosity: 0 })
          .promise;

        const render = async (
          pdfPage: Awaited<ReturnType<typeof doc.getPage>>,
          scale: number
        ) => {
          const viewport = pdfPage.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const canvasContext = canvas.getContext('2d');
          if (!canvasContext) {
            throw new Error('Could not get a 2d canvas context');
          }
          await pdfPage.render({ canvasContext, canvas, viewport }).promise;
          return canvas.toDataURL('image/png').split(',')[1];
        };

        const texts: string[] = [];
        const pages: string[] = [];
        const snapshots: string[] = [];
        let width = 0;
        let height = 0;

        for (let i = 1; i <= doc.numPages; i++) {
          const pdfPage = await doc.getPage(i);

          const content = await pdfPage.getTextContent();
          texts.push(
            content.items
              .map(item => ('str' in item ? item.str : ''))
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim()
          );

          if (i === 1) {
            const base = pdfPage.getViewport({ scale: 1 });
            width = Math.round(base.width);
            height = Math.round(base.height);
          }

          pages.push(await render(pdfPage, scales.report));
          snapshots.push(await render(pdfPage, scales.snapshot));
        }

        return {
          pageCount: doc.numPages,
          texts,
          pages,
          snapshots,
          width,
          height
        };
      },
      { libSource, workerSource, data: pdf.toString('base64'), scales }
    );

    const decode = (encoded: string[]) =>
      encoded.map(p => Buffer.from(p, 'base64'));

    return {
      pageCount: result.pageCount,
      text: result.texts.join('\n\n'),
      pages: decode(result.pages),
      snapshots: decode(result.snapshots),
      width: result.width,
      height: result.height
    };
  } finally {
    await page.close();
  }
}
