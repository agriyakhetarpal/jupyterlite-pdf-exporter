// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import type { INotebookContent } from '@jupyterlab/nbformat';

import type { Contents } from '@jupyterlab/services';

import { BaseExporter } from '@jupyterlite/services';

import { exportNotebookToPdf } from './pdf';

/**
 * A JupyterLite exporter that plugs the shared PDF pipeline
 * into JupyterLite's INbConvertExporters registry.
 *
 * This is the only module that imports from @jupyterlite/services, so
 * it is loaded lazily (see src/index.ts). It must never be reached
 * when the extension runs in JupyterLab.
 */
export class PdfExporter extends BaseExporter {
  /**
   * The MIME type of the exported format.
   */
  readonly mimeType = 'application/pdf';

  /**
   * Export a notebook to PDF format.
   *
   * @param model The notebook model to export
   * @param path The path to the notebook
   */
  async export(model: Contents.IModel, path: string): Promise<void> {
    await exportNotebookToPdf(model.content as INotebookContent, path);
  }
}
