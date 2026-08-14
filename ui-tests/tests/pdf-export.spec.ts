// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import { expect, galata, test } from '@jupyterlab/galata';

import * as path from 'path';

import { exportNotebook } from '../helpers/export';

/** Avoid needing a kernel and make exports repeatable. */
const FIXTURES = [
  {
    file: 'simple.ipynb',
    heading: 'Simple export',
    title: 'Markdown and text output',
    expected: ['Simple export', 'Hello from the PDF exporter']
  },
  {
    file: 'plot.ipynb',
    heading: 'Plot output',
    title: 'Embedded PNG output',
    expected: ['Plot output']
  },
  {
    file: 'image-attachment.ipynb',
    heading: 'Markdown image',
    title: 'Markdown image attachment',
    expected: ['Markdown image']
  },
  {
    file: 'math.ipynb',
    heading: 'Electromagnetism',
    title: 'LaTeX math output',
    expected: ['Electromagnetism', "Maxwell's equations"]
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

    const analysis = await exportNotebook(
      page,
      `${tmpPath}/${fixture.file}`,
      fixture.heading,
      slug,
      { title: fixture.title, notebook: fixture.file, group: 'Content' }
    );

    expect(analysis.pageCount).toBeGreaterThanOrEqual(1);

    for (const needle of fixture.expected) {
      expect(analysis.text).toContain(needle);
    }

    // This leftover placeholder means postprocessTypst did not
    // splice the math, so something is wrong with our pipeline
    expect(analysis.text).not.toContain('PDFEXPORTER_MATH_');
  });
}

test('Renders every equation in the math notebook', async ({
  page,
  tmpPath
}) => {
  test.setTimeout(240_000);

  const analysis = await exportNotebook(
    page,
    `${tmpPath}/math.ipynb`,
    'Electromagnetism',
    'math-equations',
    {
      title: 'Every equation renders',
      notebook: 'math.ipynb',
      group: 'Content'
    }
  );

  for (const symbol of ['∇', '𝜕', '𝜀', '𝜇', 'ℏ', 'Ψ', '∮', '∬']) {
    expect(analysis.text).toContain(symbol);
  }
  expect(analysis.text).not.toContain('PDFEXPORTER_MATH_');
  expect(analysis.text).not.toContain('\\nabla');
});
