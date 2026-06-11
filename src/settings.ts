// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

/**
 * The plugin ID whose schema (see schema/plugin.json) holds the PDF export
 * settings. It matches the ID of the exporter plugin in index.ts.
 */
const PLUGIN_ID = 'jupyterlite-pdf-exporter:plugin';

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
  linkColor: ''
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

/**
 * These are the pieces of a Pandoc `convert()` call derived from the settings:
 * top-level options and the template `variables` map.
 */
export interface IPandocConfig {
  options: Record<string, unknown>;
  variables: Record<string, unknown>;
}

/**
 * Translate the user settings into Pandoc options and Typst template variables.
 * TODO: add tests.
 * This is a pure function so it can be unit tested without the browser. The
 * general rule is to omit any unset or empty value so that Pandoc keeps its
 * default output. The only special case I noticed is page numbering, which
 * Pandoc turns on by default. We pass "1" to keep it on and "" to turn it off.
 */
export function buildPandocConfig(settings: IPdfExportSettings): IPandocConfig {
  const options: Record<string, unknown> = {};
  const variables: Record<string, unknown> = {};

  if (settings.pageSize) {
    variables.papersize = settings.pageSize;
  }
  if (settings.fontSize) {
    variables.fontsize = settings.fontSize;
  }
  if (settings.mainFont) {
    variables.mainfont = settings.mainFont;
  }
  if (settings.linkColor) {
    variables.linkcolor = settings.linkColor;
  }
  if (settings.lineSpacing && settings.lineSpacing !== 1) {
    variables.linestretch = settings.lineSpacing;
  }

  // Only include margin sides that are set, and only add the map if non-empty
  const margin: Record<string, string> = {};
  for (const side of ['top', 'bottom', 'left', 'right'] as const) {
    const value = settings.margin?.[side];
    if (value) {
      margin[side] = value;
    }
  }
  if (Object.keys(margin).length > 0) {
    variables.margin = margin;
  }

  // Pandoc numbers pages by default
  variables['page-numbering'] = settings.pageNumbers ? '1' : '';

  if (settings.tableOfContents) {
    options['table-of-contents'] = true;
  }
  if (settings.numberSections) {
    options['number-sections'] = true;
  }

  return { options, variables };
}

/**
 * A JupyterFrontEndPlugin that loads the PDF export settings from the settings
 * registry and keeps the `pdfExportSettings` singleton in sync. We use this as
 * the exporter runs in the service manager and cannot access the registry directly.
 */
export const settingsPlugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlite-pdf-exporter:settings',
  description:
    'Loads the PDF export settings and shares them with the exporter',
  autoStart: true,
  requires: [ISettingRegistry],
  activate: (
    _app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry
  ): void => {
    const load = (settings: ISettingRegistry.ISettings): void => {
      pdfExportSettings.update(
        settings.composite as unknown as Partial<IPdfExportSettings>
      );
    };

    settingRegistry
      .load(PLUGIN_ID)
      .then(settings => {
        load(settings);
        settings.changed.connect(load);
      })
      .catch(reason => {
        console.error(
          `Failed to load customisations/settings for ${PLUGIN_ID}: ${reason}. ` +
            'Falling back to the default PDF export settings.'
        );
      });
  }
};
