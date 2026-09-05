// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

/**
 * The margins around the page, one length per side (such as "2cm").
 */
export interface IPdfMargin {
  top: string;
  bottom: string;
  left: string;
  right: string;
}

/**
 * The user-facing PDF export settings, based on schema/plugin.json.
 */
export interface IPdfExportSettings {
  pageSize: string;
  fontSize: string;
  margin: IPdfMargin;
  mainFont: string;
  pageNumbers: boolean;
  tableOfContents: boolean;
  numberSections: boolean;
  lineSpacing: number;
  linkColor: string;
  theme: 'notebook' | 'neat' | 'plain';
  promptGutter: 'code' | 'all';
}

/**
 * Defaults that match the `default` values in schema/plugin.json. These are
 * used until the settings registry loads, and as fallbacks for missing keys.
 */
const DEFAULT_SETTINGS: IPdfExportSettings = {
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
  linkColor: '#0000ee',
  theme: 'notebook',
  promptGutter: 'code'
};

/**
 * A singleton holding the current PDF export settings. It is updated
 * by the settings frontend plugin and read by the PdfExporter.
 */
class PdfExportSettings {
  get current(): IPdfExportSettings {
    return this._current;
  }

  /**
   * Merge a raw settings object (from `ISettingRegistry`) over the defaults.
   * Missing or undefined keys keep their default value.
   */
  update(raw: Partial<IPdfExportSettings> | null | undefined): void {
    const r = raw ?? {};
    this._current = {
      ...DEFAULT_SETTINGS,
      ...r,
      margin: { ...DEFAULT_SETTINGS.margin, ...(r.margin ?? {}) }
    };
  }

  private _current: IPdfExportSettings = DEFAULT_SETTINGS;
}

export const pdfExportSettings = new PdfExportSettings();
