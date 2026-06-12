// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';

import { IMainMenu } from '@jupyterlab/mainmenu';

import type { INotebookContent } from '@jupyterlab/nbformat';

import { INotebookTracker } from '@jupyterlab/notebook';

import { INbConvertExporters } from '@jupyterlite/services';

import { Menu } from '@lumino/widgets';

import { exportNotebookToPdf } from './pdf';

/**
 * The command IDs used by this plugin.
 */
namespace CommandIDs {
  export const exportPdf = 'jupyterlite-pdf-exporter:export-pdf';
}

/**
 * The ID of JupyterLab's "Save and Export Notebook As" submenu, declared by
 * @jupyterlab/notebook-extension. We add our PDF command to that submenu so
 * it sits with the other export formats, which is where JupyterLite shows
 * its PDF entry too (just with a different mechanism).
 */
const EXPORT_SUBMENU_ID = 'jp-mainmenu-file-notebookexport';

/**
 * Find the "Save and Export Notebook As" submenu in JupyterLab's main menu.
 */
function findExportSubmenu(mainMenu: IMainMenu): Menu | null {
  return (
    mainMenu.fileMenu.items.find(
      item => item.type === 'submenu' && item.submenu?.id === EXPORT_SUBMENU_ID
    )?.submenu ?? null
  );
}

/**
 * A JupyterFrontEndPlugin that adds an "Export Notebook to PDF" command for
 * JupyterLab and Jupyter Notebook. It reads the active notebook and runs the same
 * Pandoc and Typst pipeline used by the JupyterLite exporter.
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
      // Inside the export submenu, we sit next to a server-side "PDF" entry,
      // so we name ourselves so the two are easy to tell apart. Elsewhere,
      // such as the command palette, we can use the full label.
      label: args =>
        args.fromExportMenu
          ? 'PDF (via jupyterlite-pdf-exporter)'
          : 'Save and Export Notebook: PDF (via jupyterlite-pdf-exporter)',
      caption:
        'Export the current notebook to a PDF in the browser using Pandoc and Typst, with neither a LaTeX distribution nor a server needed',
      isEnabled: () => tracker.currentWidget !== null,
      execute: async () => {
        const panel = tracker.currentWidget;
        if (!panel || !panel.model) {
          return;
        }
        const notebook = panel.model.toJSON() as INotebookContent;
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
      const exportSubmenu = findExportSubmenu(mainMenu);
      if (exportSubmenu) {
        exportSubmenu.addItem({
          command: CommandIDs.exportPdf,
          args: { fromExportMenu: true }
        });
      }
    }

    // Keep the menu and palette enable state in sync with the active notebook
    tracker.currentChanged.connect(() => {
      app.commands.notifyCommandChanged(CommandIDs.exportPdf);
    });
  }
};
