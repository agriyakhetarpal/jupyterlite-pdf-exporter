// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import { expect, galata, test } from '@jupyterlab/galata';

import * as path from 'path';

import { exportNotebook, writeSettings } from '../helpers/export';

const NOTEBOOK = 'options.ipynb';

const TEST_CASES: {
  slug: string;
  title: string;
  settings: Record<string, unknown>;
  check?: (a: { text: string; width: number; height: number }) => void;
}[] = [
  {
    slug: 'opt-defaults',
    title: 'Defaults',
    settings: {},
    check: a => {
      // A4 := 595.28 x 841.89 pt
      expect(a.width).toBe(595);
      expect(a.height).toBe(842);
      // The notebook theme shows cell prompts
      expect(a.text).toContain('In [1]:');
    }
  },
  {
    slug: 'opt-promptgutter-all',
    title: 'promptGutter: all',
    settings: { promptGutter: 'all' },
    check: a => {
      expect(a.text).toContain('In [1]:');
    }
  },
  {
    slug: 'opt-theme-neat',
    title: 'theme: neat',
    settings: { theme: 'neat' },
    check: a => {
      expect(a.text).not.toContain('In [1]:');
    }
  },
  {
    slug: 'opt-pagesize-us-letter',
    title: 'pageSize: us-letter',
    settings: { pageSize: 'us-letter' },
    check: a => {
      expect(a.width).toBe(612);
      expect(a.height).toBe(792);
    }
  },
  {
    slug: 'opt-pagesize-a5',
    title: 'pageSize: a5',
    settings: { pageSize: 'a5' },
    check: a => {
      expect(a.width).toBeLessThan(595);
      expect(a.height).toBeLessThan(842);
    }
  },
  {
    slug: 'opt-fontsize-14pt',
    title: 'fontSize: 14pt',
    settings: { fontSize: '14pt' }
  },
  {
    slug: 'opt-margin-wide',
    title: 'margin: 5cm all round',
    settings: {
      margin: { top: '5cm', bottom: '5cm', left: '5cm', right: '5cm' }
    }
  },
  {
    slug: 'opt-mainfont-ncm',
    title: 'mainFont: New Computer Modern',
    settings: { mainFont: 'New Computer Modern' }
  },
  {
    slug: 'opt-mainfont-dejavu',
    title: 'mainFont: DejaVu Sans Mono',
    settings: { mainFont: 'DejaVu Sans Mono' }
  },
  {
    slug: 'opt-pagenumbers-off',
    title: 'pageNumbers: false',
    settings: { pageNumbers: false },
    check: a => {
      expect(a.text.trim().endsWith('1')).toBe(false);
    }
  },
  {
    slug: 'opt-toc-on',
    title: 'tableOfContents: true',
    settings: { tableOfContents: true },
    check: a => {
      // Each heading appears once in the contents list, and once in the body
      expect(a.text.split('First section').length - 1).toBeGreaterThanOrEqual(
        2
      );
    }
  },
  {
    slug: 'opt-numbersections-on',
    title: 'numberSections: true',
    settings: { numberSections: true },
    check: a => {
      expect(a.text).toMatch(/1\.1\.\s+First section/);
      expect(a.text).toMatch(/1\.2\.\s+Second section/);
    }
  },
  {
    slug: 'opt-linespacing-1_8',
    title: 'lineSpacing: 1.8',
    settings: { lineSpacing: 1.8 }
  },
  {
    slug: 'opt-linkcolor',
    title: 'linkColor: #0F4C81',
    settings: { linkColor: '#0F4C81' }
  },
  {
    slug: 'opt-combined',
    title: 'Combined: toc, numbered, us-letter, 12pt',
    settings: {
      pageSize: 'us-letter',
      fontSize: '12pt',
      tableOfContents: true,
      numberSections: true,
      lineSpacing: 1.25
    },
    check: a => {
      expect(a.width).toBe(612);
      expect(a.text).toMatch(/1\.1\.\s+First section/);
    }
  }
];

// Because the settings are global, the tests must run in serial mode.
// Note that this is only required because of disabling the Galata
// mocks, so that we can exercise the settings plugin and the registry.
test.describe.configure({ mode: 'serial' });
test.use({
  autoGoto: false,
  tmpPath: 'pdf-options-test',
  mockSettings: false
});

test.beforeAll(async ({ request, tmpPath }) => {
  const contents = galata.newContentsHelper(request);
  await contents.uploadDirectory(
    path.resolve(__dirname, '..', 'test-files'),
    tmpPath
  );
});

test.afterAll(async ({ request, tmpPath }) => {
  await writeSettings(request, {});
  const contents = galata.newContentsHelper(request);
  await contents.deleteDirectory(tmpPath);
});

for (const testCase of TEST_CASES) {
  test(`exports with ${testCase.title}`, async ({ page, request, tmpPath }) => {
    test.setTimeout(240_000);

    await writeSettings(request, testCase.settings);

    const analysis = await exportNotebook(
      page,
      `${tmpPath}/${NOTEBOOK}`,
      testCase.slug,
      {
        title: testCase.title,
        notebook: NOTEBOOK,
        group: 'Settings',
        settings: testCase.settings
      }
    );

    // Several settings only change appearance, so this guards every case
    // against the blank-PDF failure mode; the rest is judged in the report.
    expect(analysis.text.replace(/\s+/g, '').length).toBeGreaterThan(20);
    testCase.check?.(analysis);
  });
}
