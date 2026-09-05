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
  theme: 'notebook' | 'neat' | 'plain';
  promptGutter: 'code' | 'all';
  hideInputs: boolean;
  hideOutputs: boolean;
  ansiColors: boolean;
  pageSize: string;
  margin: IPdfMargin;
  pageNumbers: boolean;
  mainFont: string;
  fontSize: string;
  lineSpacing: number;
  linkColor: string;
  tableOfContents: boolean;
  numberSections: boolean;
}

/**
 * Defaults that match the `default` values in schema/plugin.json. These are
 * used until the settings registry loads, and as fallbacks for missing keys.
 */
const DEFAULT_SETTINGS: IPdfExportSettings = {
  theme: 'notebook',
  promptGutter: 'code',
  hideInputs: false,
  hideOutputs: false,
  ansiColors: true,
  pageSize: 'a4',
  margin: {
    top: '2.5cm',
    bottom: '2.5cm',
    left: '2cm',
    right: '2cm'
  },
  pageNumbers: true,
  mainFont: 'Libertinus Serif',
  fontSize: '10pt',
  lineSpacing: 1,
  linkColor: '#0000ee',
  tableOfContents: false,
  numberSections: false
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
