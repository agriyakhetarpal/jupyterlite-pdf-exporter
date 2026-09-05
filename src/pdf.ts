// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import type { INotebookContent } from '@jupyterlab/nbformat';

import { preprocessNotebook } from './preprocess';

import { pdfExportProgress } from './progress';

import { pdfExportSettings } from './settings';

import { installBundledPackages } from './typst-packages';

import { buildTypstWrapper } from './typst-wrapper';

// Typst compiler creates a global $typst
declare const $typst: {
  resetShadow: () => void;
  mapShadow: (path: string, data: Uint8Array) => void;
  pdf: (options: { mainFilePath: string }) => Promise<Uint8Array>;
};

let typstLoaded = false;
let typstLoadingPromise: Promise<void> | null = null;

/**
 * Export a notebook to a PDF with Typst and Callisto.
 *
 * The notebook is preprocessed, then compiled together with a Typst
 * wrapper that imports Callisto and applies the user settings.
 *
 * This function should remain free of any JupyterLab or JupyterLite dependency.
 * It takes the notebook content directly so it can be called from both the
 * JupyterLite exporter adapter and the JupyterLab command.
 *
 * @param notebook The notebook content (nbformat JSON) to export
 * @param path The path to the notebook, used to name the downloaded file
 */
export async function exportNotebookToPdf(
  notebook: INotebookContent,
  path: string
): Promise<void> {
  try {
    // step 1: load Typst and the bundled packages
    pdfExportProgress.start('Preparing PDF export…');
    await loadTypst();

    // Note to self: preprocessNotebook rewrites outputs in place, so
    // we work  on a copy to leave the caller's notebook untouched.
    const working = structuredClone(notebook);
    preprocessNotebook(working);
    const wrapper = buildTypstWrapper(pdfExportSettings.current);

    pdfExportProgress.update('Generating PDF…');

    const encoder = new TextEncoder();

    $typst.resetShadow();
    $typst.mapShadow('/main.typ', encoder.encode(wrapper));
    $typst.mapShadow(
      '/notebook.ipynb',
      encoder.encode(JSON.stringify(working))
    );
    const pdfData = await $typst.pdf({ mainFilePath: '/main.typ' });

    // This should not really happen since we'll at least have the PDF header
    // and at least one cell in the notebook (even if it's empty)
    if (!pdfData || pdfData.length === 0) {
      throw new Error('Typst produced empty PDF output');
    }

    // last step: download the PDF in the browser
    const pdfBlob = new Blob([pdfData.buffer as ArrayBuffer], {
      type: 'application/pdf'
    });
    const filename = path.replace(/\.ipynb$/, '.pdf');
    triggerBlobDownload(pdfBlob, filename);

    pdfExportProgress.finish('PDF exported successfully');
  } catch (error) {
    pdfExportProgress.finish('PDF export failed');
    throw error;
  }
}

/**
 * Lazy load the Typst compiler and the bundled packages. The compiler is a
 * large download, so this only happens on the first export. The module sets
 * the global $typst as a side effect of being imported.
 * @returns – a promise that resolves when the compiler is ready.
 */
async function loadTypst(): Promise<void> {
  if (typstLoaded && typeof $typst !== 'undefined') {
    return;
  }
  if (typstLoadingPromise) {
    return typstLoadingPromise;
  }

  typstLoadingPromise = (async () => {
    await import('@myriaddreamin/typst-all-in-one.ts');

    // The module sets the global $typst asynchronously, so poll until ready
    await new Promise<void>(resolve => {
      const checkTypst = (): void => {
        if (typeof $typst !== 'undefined') {
          typstLoaded = true;
          resolve();
        } else {
          setTimeout(checkTypst, 100);
        }
      };
      checkTypst();
    });
    await installBundledPackages();
  })();

  return typstLoadingPromise;
}

/**
 * Trigger a download of a Blob in the browser with the specified filename.
 * @param blob – the Blob to download
 * @param filename – the desired filename for the downloaded file
 */
function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const element = document.createElement('a');
  element.href = url;
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(url);
}
