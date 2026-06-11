// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { IPdfExportSettings, pdfExportSettings } from './settings';

/**
 * The plugin ID whose schema (see schema/plugin.json) holds the PDF export
 * settings. It matches the ID of the exporter plugin in index.ts.
 */
const PLUGIN_ID = 'jupyterlite-pdf-exporter:plugin';

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
        const message =
          reason instanceof Error ? reason.message : String(reason);
        console.error(
          `Failed to load settings for ${PLUGIN_ID}: ${message}. ` +
            'Falling back to the default PDF export settings.'
        );
      });
  }
};
