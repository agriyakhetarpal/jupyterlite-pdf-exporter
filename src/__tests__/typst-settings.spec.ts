// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import type { IPdfExportSettings } from '../settings';

import { buildTypstSettings, parseLength } from '../typst-settings';

const baseSettings: IPdfExportSettings = {
  pageSize: 'a4',
  fontSize: '10pt',
  margin: {
    top: '2.5cm',
    bottom: '2.5cm',
    left: '2cm',
    right: '2cm'
  },
  mainFont: 'Libertinus Serif',
  pageNumbers: true,
  tableOfContents: false,
  numberSections: false,
  lineSpacing: 1,
  linkColor: '',
  theme: 'notebook'
};

describe('parseLength', () => {
  it('splits a length into its number and unit', () => {
    expect(parseLength('2.5cm', 'x')).toEqual({ value: 2.5, unit: 'cm' });
    expect(parseLength('12pt', 'x')).toEqual({ value: 12, unit: 'pt' });
    expect(parseLength('.5in', 'x')).toEqual({ value: 0.5, unit: 'in' });
    expect(parseLength(' 1.2 em ', 'x')).toEqual({ value: 1.2, unit: 'em' });
  });

  it('returns null for an empty value', () => {
    expect(parseLength('', 'x')).toBeNull();
    expect(parseLength('  ', 'x')).toBeNull();
  });

  it('rejects values that are not a number followed by a unit', () => {
    expect(() => parseLength('12', 'font size')).toThrow(/Invalid font size/);
    expect(() => parseLength('wide', 'left margin')).toThrow(
      /Invalid left margin/
    );
    expect(() => parseLength('10pt); #while true {}', 'x')).toThrow();
  });
});

describe('buildTypstSettings', () => {
  it('maps the settings to data for the wrapper', () => {
    expect(buildTypstSettings(baseSettings)).toEqual({
      pageSize: 'a4',
      fontSize: { value: 10, unit: 'pt' },
      margin: {
        top: { value: 2.5, unit: 'cm' },
        bottom: { value: 2.5, unit: 'cm' },
        left: { value: 2, unit: 'cm' },
        right: { value: 2, unit: 'cm' }
      },
      mainFont: 'Libertinus Serif',
      pageNumbers: true,
      tableOfContents: false,
      numberSections: false,
      lineSpacing: 1,
      linkColor: null,
      theme: 'notebook'
    });
  });

  it('turns empty values into null so Typst keeps its defaults', () => {
    const data = buildTypstSettings({
      ...baseSettings,
      pageSize: '',
      fontSize: '',
      mainFont: ' ',
      margin: { top: '3cm', bottom: '', left: '', right: '' }
    });
    expect(data.pageSize).toBeNull();
    expect(data.fontSize).toBeNull();
    expect(data.mainFont).toBeNull();
    expect(data.margin).toEqual({
      top: { value: 3, unit: 'cm' },
      bottom: null,
      left: null,
      right: null
    });
  });

  it('passes strings through as values, not code', () => {
    const font = 'X") #while true {} "';
    expect(
      buildTypstSettings({ ...baseSettings, mainFont: font }).mainFont
    ).toBe(font);
  });

  it('normalises the link colour to a leading "#"', () => {
    expect(
      buildTypstSettings({ ...baseSettings, linkColor: '0F4C81' }).linkColor
    ).toBe('#0F4C81');
    expect(
      buildTypstSettings({ ...baseSettings, linkColor: '#0F4C81' }).linkColor
    ).toBe('#0F4C81');
  });

  it('falls back to a line spacing of 1', () => {
    expect(
      buildTypstSettings({ ...baseSettings, lineSpacing: 0 }).lineSpacing
    ).toBe(1);
    expect(
      buildTypstSettings({ ...baseSettings, lineSpacing: 1.5 }).lineSpacing
    ).toBe(1.5);
  });

  it('passes the theme and toggles through', () => {
    const data = buildTypstSettings({
      ...baseSettings,
      theme: 'neat',
      tableOfContents: true,
      numberSections: true,
      pageNumbers: false
    });
    expect(data.theme).toBe('neat');
    expect(data.tableOfContents).toBe(true);
    expect(data.numberSections).toBe(true);
    expect(data.pageNumbers).toBe(false);
  });
});
