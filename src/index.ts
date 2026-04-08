// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import { ServiceManagerPlugin } from '@jupyterlab/services';

import { INbConvertExporters } from '@jupyterlite/services';

import { PdfExporter } from './pdf';

import { statusBarPlugin } from './status';

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
  requires: [INbConvertExporters],
  activate: (_: null, exporters: INbConvertExporters): void => {
    exporters.register('PDF (via Pandoc)', new PdfExporter());
  }
};

export default [exporterPlugin, statusBarPlugin];
