// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import { expect, galata, test } from '@jupyterlab/galata';

import * as path from 'path';

import { exportNotebook, IExport } from '../helpers/export';

/**
 * Check if a PDF embeds at least one raster image.
 * @param pdf The PDF buffer to check.
 * @returns True if the PDF contains an image.
 */
const hasImage = (pdf: Buffer) =>
  pdf.toString('latin1').includes('/Subtype /Image');

/**
 * Check if a PDF embeds at least one image with alt text.
 * @param pdf The PDF buffer to check.
 * @returns True if the PDF contains an image with an /Alt tag.
 */
const hasAltText = (pdf: Buffer) => pdf.toString('latin1').includes('/Alt');

/** Avoid needing a kernel and make exports repeatable. */
const FIXTURES: {
  file: string;
  title: string;
  check: (result: IExport) => void;
}[] = [
  {
    file: 'simple.ipynb',
    title: 'Markdown and text output',
    check: r => {
      expect(r.text).toContain('Hello from the PDF exporter');
      expect(hasImage(r.pdf)).toBe(false);
    }
  },
  {
    file: 'plot.ipynb',
    title: 'Embedded PNG output',
    check: r => {
      expect(hasImage(r.pdf)).toBe(true);
    }
  },
  {
    file: 'image-attachment.ipynb',
    title: 'Markdown image attachment',
    check: r => {
      expect(hasImage(r.pdf)).toBe(true);
      expect(hasAltText(r.pdf)).toBe(true);
    }
  },
  {
    file: 'math.ipynb',
    title: 'LaTeX math output',
    check: r => {
      // Typst emits glyphs, with Greek as mathematical italic codepoints
      for (const symbol of ['∇', '𝜕', '𝜀', '𝜇', 'ℏ', 'Ψ', '∮', '∬']) {
        expect(r.text).toContain(symbol);
      }
      expect(r.text).not.toContain('\\nabla');
    }
  }
];

test.use({ autoGoto: false, tmpPath: 'pdf-export-test' });

test.beforeAll(async ({ request, tmpPath }) => {
  const contents = galata.newContentsHelper(request);
  await contents.uploadDirectory(
    path.resolve(__dirname, '..', 'test-files'),
    tmpPath
  );
});

test.afterAll(async ({ request, tmpPath }) => {
  const contents = galata.newContentsHelper(request);
  await contents.deleteDirectory(tmpPath);
});

for (const fixture of FIXTURES) {
  const slug = fixture.file.replace(/\.ipynb$/, '');

  test(`Exports ${fixture.file} to a PDF`, async ({ page, tmpPath }) => {
    test.setTimeout(240_000);

    const result = await exportNotebook(
      page,
      `${tmpPath}/${fixture.file}`,
      slug,
      { title: fixture.title, notebook: fixture.file, group: 'Content' }
    );

    expect(result.pageCount).toBeGreaterThanOrEqual(1);

    // Guard against exporting a notebook that has not loaded
    expect(result.text.replace(/\s+/g, '').length).toBeGreaterThan(20);

    // This leftover placeholder means postprocessTypst did not
    // splice the math, so something is wrong with our pipeline
    expect(result.text).not.toContain('PDFEXPORTER_MATH_');

    fixture.check(result);
  });
}
