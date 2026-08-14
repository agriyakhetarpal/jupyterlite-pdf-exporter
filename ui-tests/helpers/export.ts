// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import { expect, test } from '@jupyterlab/galata';
import type { IJupyterLabPageFixture } from '@jupyterlab/galata';

import type { DocumentWidget } from '@jupyterlab/docregistry';

import type { APIRequestContext } from '@playwright/test';

import * as fs from 'fs';
import * as path from 'path';

import { analysePdf, IPdfAnalysis } from './pdf';

export type IExport = IPdfAnalysis & { pdf: Buffer };

export const OUTPUT_DIR = path.resolve(__dirname, '..', 'pdf-output');

export const COMMAND_ID = 'jupyterlite-pdf-exporter:export-pdf';

export const SETTINGS_ID = 'jupyterlite-pdf-exporter:plugin';

/**
 * Save settings to the server. Callers must run this serially.
 */
export async function writeSettings(
  request: APIRequestContext,
  overrides: Record<string, unknown>
): Promise<void> {
  const url = `/lab/api/settings/${SETTINGS_ID}`;
  const response = await request.put(url, {
    data: { raw: JSON.stringify(overrides) }
  });
  if (!response.ok()) {
    const body = (await response.text()).slice(0, 200);
    throw new Error(`PUT ${url} failed: ${response.status()} ${body}`);
  }
}

/**
 * Open a notebook, write into it, and export the PDF.
 */
export async function exportNotebook(
  page: IJupyterLabPageFixture,
  notebookPath: string,
  slug: string,
  meta: Record<string, unknown> = {}
): Promise<IExport> {
  await page.goto();
  await page.notebook.openByPath(notebookPath);
  await page.notebook.activate(notebookPath);

  await page.evaluate(async () => {
    const widget = window.jupyterapp.shell
      .currentWidget as DocumentWidget | null;
    await widget?.context?.ready;
  });

  // Download to disk
  const downloadPromise = page.waitForEvent('download', { timeout: 200_000 });
  await page.evaluate(async (id: string) => {
    await window.jupyterapp.commands.execute(id);
  }, COMMAND_ID);
  const download = await downloadPromise;

  // Open the PDF and get the text, page count, number of pages, and size for assertions
  const pdfPath = path.join(OUTPUT_DIR, `${slug}.pdf`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  await download.saveAs(pdfPath);
  const pdf = fs.readFileSync(pdfPath);

  expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');

  const analysis = await analysePdf(page.context(), pdf);

  // Write the metadata for the test report
  fs.writeFileSync(path.join(OUTPUT_DIR, `${slug}.txt`), analysis.text);
  fs.writeFileSync(path.join(OUTPUT_DIR, `${slug}.png`), analysis.pages[0]);
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${slug}.json`),
    JSON.stringify(
      {
        slug,
        testTitle: test.info().title,
        pageCount: analysis.pageCount,
        bytes: pdf.length,
        width: analysis.width,
        height: analysis.height,
        ...meta
      },
      null,
      2
    )
  );

  return { ...analysis, pdf };
}
