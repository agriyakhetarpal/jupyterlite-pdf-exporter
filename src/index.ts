// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import { ServiceManagerPlugin } from '@jupyterlab/services';

import { INbConvertExporters } from '@jupyterlite/services';

import { commandPlugin } from './command';

import { statusBarPlugin } from './status';

import { settingsPlugin } from './settings-plugin';

/**
 * A ServiceManagerPlugin for JupyterLite that registers a PDF exporter based
 * on WebAssembly distributions of Pandoc and Typst. This uses the INbConvertExporters
 * token to register the exporter, which allows it to be shown in JupyterLite's export
 * menu and subsequently in the "File" menu > "Save and Export Notebook As" dropdown.
 */
const exporterPlugin: ServiceManagerPlugin<void> = {
  id: 'jupyterlite-pdf-exporter:plugin',
  description:
    'A PDF exporter for JupyterLite based on WebAssembly distributions of Pandoc and Typst',
  autoStart: true,
  optional: [INbConvertExporters],
  activate: async (
    _: null,
    exporters: INbConvertExporters | null
  ): Promise<void> => {
    // INbConvertExporters is only provided in JupyterLite. In JupyterLab and Jupyter
    // Notebook it resolves to null, so there is nothing to register here.
    if (!exporters) {
      return;
    }
    const { PdfExporter } = await import('./jupyterlite-exporter');
    exporters.register('PDF', new PdfExporter());
  }
};

export default [exporterPlugin, commandPlugin, statusBarPlugin, settingsPlugin];
