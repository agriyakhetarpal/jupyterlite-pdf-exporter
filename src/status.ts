// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IStatusBar } from '@jupyterlab/statusbar';

import { Widget } from '@lumino/widgets';

import { pdfExportProgress } from './progress';

/**
 * This is a Lumino widget that listens to the pdfExportProgress singleton for updates and displays
 * related to PDF export progress and displays them in the centre of the status bar. It is registered as a status bar item in the statusBarPlugin below.
 */
class PdfExportStatusWidget extends Widget {
  constructor() {
    super();
    this.node.classList.add('jp-StatusBar-TextItem');
    pdfExportProgress.progressChanged.connect(this._onProgressChanged, this);
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    pdfExportProgress.progressChanged.disconnect(this._onProgressChanged, this);
    super.dispose();
  }

  private _onProgressChanged(_sender: unknown, message: string): void {
    this.node.textContent = message;
  }
}

/**
 * A JupyterFrontEndPlugin that registers a status bar item
 * for PDF export progress.
 */
export const statusBarPlugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlite-pdf-exporter:status-bar',
  description: 'A status bar progress indicator for PDF export',
  autoStart: true,
  optional: [IStatusBar],
  activate: (_app: JupyterFrontEnd, statusBar: IStatusBar | null): void => {
    if (!statusBar) {
      return;
    }

    const widget = new PdfExportStatusWidget();

    statusBar.registerStatusItem('jupyterlite-pdf-exporter:status-bar', {
      item: widget,
      align: 'middle',
      isActive: () => pdfExportProgress.isActive,
      activeStateChanged: pdfExportProgress.activeStateChanged
    });
  }
};
