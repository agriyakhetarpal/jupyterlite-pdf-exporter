// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { INotebookTracker } from '@jupyterlab/notebook';

import { INbConvertExporters } from '@jupyterlite/services';

import { exportNotebookToPdf } from './pdf';

/**
 * The command IDs used by this plugin.
 */
namespace CommandIDs {
  export const exportPdf = 'jupyterlite-pdf-exporter:export-pdf';
}

/**
 * A JupyterFrontEndPlugin that adds an "Export Notebook to PDF" command for
 * JupyterLab and Notebook 7. It reads the active notebook and runs the same
 * pandoc and Typst pipeline used by the JupyterLite exporter.
 *
 * In JupyterLite, the native "Save and Export Notebook As" menu already offers PDF
 * export, so we skip this command there to avoid duplicating. We detect JupyterLite
 * by asking for the INbConvertExporters token as an optional dependency. It will
 * resolve to a value in JupyterLite and to null in JupyterLab.
 */
export const commandPlugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlite-pdf-exporter:commands',
  description: 'Adds an "Export Notebook to PDF" command',
  autoStart: true,
  requires: [INotebookTracker],
  optional: [ICommandPalette, IMainMenu, INbConvertExporters],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
    palette: ICommandPalette | null,
    mainMenu: IMainMenu | null,
    nbConvertExporters: INbConvertExporters | null
  ): void => {
    // JupyterLite
    if (nbConvertExporters) {
      return;
    }

    app.commands.addCommand(CommandIDs.exportPdf, {
      label: 'Export Notebook to PDF',
      caption:
        'Export the current notebook to a PDF in the browser, using Pandoc and Typst',
      isEnabled: () => tracker.currentWidget !== null,
      execute: async () => {
        const panel = tracker.currentWidget;
        if (!panel || !panel.model) {
          return;
        }
        const notebook = panel.model.toJSON() as unknown as Record<
          string,
          unknown
        >;
        await exportNotebookToPdf(notebook, panel.context.path);
      }
    });

    if (palette) {
      palette.addItem({
        command: CommandIDs.exportPdf,
        category: 'Notebook Operations'
      });
    }

    if (mainMenu) {
      mainMenu.fileMenu.addGroup([{ command: CommandIDs.exportPdf }], 60);
    }

    // Keep the menu and palette enable state in sync with the active notebook
    tracker.currentChanged.connect(() => {
      app.commands.notifyCommandChanged(CommandIDs.exportPdf);
    });
  }
};
