// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import type { IPdfExportSettings } from '../settings';

import { buildTypstWrapper } from '../typst-wrapper';

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

describe('buildTypstWrapper', () => {
  it('imports Callisto and renders the notebook', () => {
    const wrapper = buildTypstWrapper(baseSettings);
    expect(wrapper).toContain('#import "@preview/callisto:0.3.0"');
    expect(wrapper).toContain('nb: path("notebook.ipynb")');
    expect(wrapper).toContain('theme: "notebook"');
  });

  it('uses the given notebook path', () => {
    const wrapper = buildTypstWrapper(baseSettings, 'analysis.ipynb');
    expect(wrapper).toContain('nb: path("analysis.ipynb")');
  });

  it('maps page size, margins, and page numbers to a page rule', () => {
    const wrapper = buildTypstWrapper(baseSettings);
    expect(wrapper).toContain(
      '#set page(paper: "a4", margin: (top: 2.5cm, bottom: 2.5cm, left: 2cm, right: 2cm), numbering: "1")'
    );
  });

  it('omits margin sides that are empty', () => {
    const wrapper = buildTypstWrapper({
      ...baseSettings,
      margin: { top: '3cm', bottom: '', left: '', right: '' }
    });
    expect(wrapper).toContain('margin: (top: 3cm)');
  });

  it('turns page numbers off', () => {
    const wrapper = buildTypstWrapper({ ...baseSettings, pageNumbers: false });
    expect(wrapper).toContain('numbering: none');
  });

  it('maps the font and size to a text rule', () => {
    const wrapper = buildTypstWrapper(baseSettings);
    expect(wrapper).toContain(
      '#set text(font: "Libertinus Serif", size: 10pt)'
    );
  });

  it('escapes quotes in string values', () => {
    const wrapper = buildTypstWrapper({
      ...baseSettings,
      mainFont: 'Say "hi"'
    });
    expect(wrapper).toContain('font: "Say \\"hi\\""');
  });

  it('keeps the default leading when line spacing is 1', () => {
    const wrapper = buildTypstWrapper(baseSettings);
    expect(wrapper).toContain('leading: 1 * 0.65em');
  });

  it('scales the leading with the line spacing', () => {
    const wrapper = buildTypstWrapper({ ...baseSettings, lineSpacing: 1.5 });
    expect(wrapper).toContain('leading: 1.5 * 0.65em');
  });

  it('omits the link rule when the color is empty', () => {
    const wrapper = buildTypstWrapper(baseSettings);
    expect(wrapper).not.toContain('#show link');
  });

  it('accepts a hex link color with or without a leading "#"', () => {
    expect(
      buildTypstWrapper({ ...baseSettings, linkColor: '#0F4C81' })
    ).toContain('#show link: set text(fill: rgb("#0F4C81"))');
    expect(
      buildTypstWrapper({ ...baseSettings, linkColor: '0F4C81' })
    ).toContain('rgb("#0F4C81")');
  });

  it('rejects a link color that is not hex', () => {
    expect(() =>
      buildTypstWrapper({ ...baseSettings, linkColor: 'blue' })
    ).toThrow(/Invalid colour/);
  });

  it('adds an outline and heading numbers when asked', () => {
    const wrapper = buildTypstWrapper({
      ...baseSettings,
      tableOfContents: true,
      numberSections: true
    });
    expect(wrapper).toContain('#outline()');
    expect(wrapper).toContain('#set heading(numbering: "1.")');
    expect(wrapper.indexOf('#outline()')).toBeLessThan(
      wrapper.indexOf('#callisto.render(')
    );
  });

  it('omits the outline and heading numbers by default', () => {
    const wrapper = buildTypstWrapper(baseSettings);
    expect(wrapper).not.toContain('#outline()');
    expect(wrapper).not.toContain('#set heading');
  });

  it('passes the theme through', () => {
    const wrapper = buildTypstWrapper({ ...baseSettings, theme: 'neat' });
    expect(wrapper).toContain('theme: "neat"');
  });
});
