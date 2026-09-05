import { IPdfExportSettings, pdfExportSettings } from '../settings';

describe('pdfExportSettings', () => {
  beforeEach(() => {
    pdfExportSettings.update(undefined);
  });

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
