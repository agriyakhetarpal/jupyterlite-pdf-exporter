import {
  buildPandocConfig,
  IPdfExportSettings,
  pdfExportSettings
} from '../settings';

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
  linkColor: ''
};

describe('buildPandocConfig', () => {
  it('maps the curated settings to pandoc variables', () => {
    const { variables } = buildPandocConfig({
      ...baseSettings,
      pageSize: 'us-letter',
      fontSize: '12pt',
      mainFont: 'New Computer Modern'
    });
    expect(variables.papersize).toBe('us-letter');
    expect(variables.fontsize).toBe('12pt');
    expect(variables.mainfont).toBe('New Computer Modern');
  });

  it('builds the margin map from the four sides', () => {
    const { variables } = buildPandocConfig(baseSettings);
    expect(variables.margin).toEqual({
      top: '2.5cm',
      bottom: '2.5cm',
      left: '2cm',
      right: '2cm'
    });
  });

  it('omits margin sides that are empty', () => {
    const { variables } = buildPandocConfig({
      ...baseSettings,
      margin: { top: '3cm', bottom: '', left: '', right: '' }
    });
    expect(variables.margin).toEqual({ top: '3cm' });
  });

  it('keeps page numbers on by default with "1"', () => {
    const { variables } = buildPandocConfig({
      ...baseSettings,
      pageNumbers: true
    });
    expect(variables['page-numbering']).toBe('1');
  });

  it('turns page numbers off with an empty value', () => {
    const { variables } = buildPandocConfig({
      ...baseSettings,
      pageNumbers: false
    });
    expect(variables['page-numbering']).toBe('');
  });

  it('omits line spacing when it is the default of 1', () => {
    const { variables } = buildPandocConfig(baseSettings);
    expect(variables.linestretch).toBeUndefined();
  });

  it('includes line spacing when it differs from 1', () => {
    const { variables } = buildPandocConfig({
      ...baseSettings,
      lineSpacing: 1.5
    });
    expect(variables.linestretch).toBe(1.5);
  });

  it('omits link color when it is empty', () => {
    const { variables } = buildPandocConfig(baseSettings);
    expect(variables.linkcolor).toBeUndefined();
  });

  it('strips a leading "#" from a hex link color', () => {
    const { variables } = buildPandocConfig({
      ...baseSettings,
      linkColor: '#1a73e8'
    });
    expect(variables.linkcolor).toBe('1a73e8');
  });

  it('accepts a hex link color without a leading "#"', () => {
    const { variables } = buildPandocConfig({
      ...baseSettings,
      linkColor: 'ff0000'
    });
    expect(variables.linkcolor).toBe('ff0000');
  });

  it('sets table of contents and number sections as top-level options', () => {
    const { options } = buildPandocConfig({
      ...baseSettings,
      tableOfContents: true,
      numberSections: true
    });
    expect(options['table-of-contents']).toBe(true);
    expect(options['number-sections']).toBe(true);
  });

  it('omits the toggle options when they are off', () => {
    const { options } = buildPandocConfig(baseSettings);
    expect(options['table-of-contents']).toBeUndefined();
    expect(options['number-sections']).toBeUndefined();
  });
});

describe('pdfExportSettings', () => {
  it('falls back to defaults for missing keys', () => {
    pdfExportSettings.update({ pageSize: 'a3' });
    expect(pdfExportSettings.current.pageSize).toBe('a3');
    expect(pdfExportSettings.current.mainFont).toBe('Libertinus Serif');
    expect(pdfExportSettings.current.margin.left).toBe('2cm');
  });

  it('merges a partial margin over the default margin', () => {
    pdfExportSettings.update({
      margin: { top: '5cm' } as IPdfExportSettings['margin']
    });
    expect(pdfExportSettings.current.margin.top).toBe('5cm');
    expect(pdfExportSettings.current.margin.bottom).toBe('2.5cm');
  });
});
