// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import type { INotebookContent } from '@jupyterlab/nbformat';

import { preprocessNotebook } from './preprocess';

import { pdfExportProgress } from './progress';

import { pdfExportSettings } from './settings';

import { buildTypstSettings } from './typst-settings';

import type { ICompileRequest, ICompileResponse } from './typst-worker';

import { createTypstWorker } from './typst-worker-url';

import wrapperSource from '../typst/wrapper.typ';

/**
 * How long a compilation may take before it is abandoned. We terminate
 * the worker if we suspect that we are running perennial Typst code. A
 * PDF export should never take more than a few seconds in practice.
 */
const COMPILE_TIMEOUT_MS = 120_000;

let worker: Worker | null = null;
let nextRequestId = 0;

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
    pdfExportProgress.start('Preparing PDF export…');

    // Note to self: preprocessNotebook rewrites outputs in place, so
    // we work on a copy to leave the caller's notebook untouched.
    const working = structuredClone(notebook);
    preprocessNotebook(working);
    const typstSettings = buildTypstSettings(pdfExportSettings.current);

    pdfExportProgress.update('Generating PDF…');
    const pdfData = await compileInWorker({
      '/main.typ': wrapperSource,
      '/notebook.ipynb': JSON.stringify(working),
      '/settings.json': JSON.stringify(typstSettings)
    });

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
 * Get the compiler worker, starting it on first use. The compiler and the
 * bundled packages load inside the worker on first use.
 * @returns - the worker instance
 */
function getWorker(): Worker {
  worker ??= createTypstWorker();
  return worker;
}

/**
 * Compile the given files in the worker and return the PDF bytes.
 * @param files - a record of absolute paths to file contents, with /main.typ as the main file
 * @returns - a promise that resolves to the compiled PDF bytes
 */
function compileInWorker(files: Record<string, string>): Promise<Uint8Array> {
  const id = nextRequestId++;
  const request: ICompileRequest = { id, files };
  return new Promise((resolve, reject) => {
    const target = getWorker();

    const cleanup = (): void => {
      clearTimeout(timer);
      target.removeEventListener('message', onMessage);
      target.removeEventListener('error', onError);
    };
    const onMessage = (event: MessageEvent<ICompileResponse>): void => {
      if (event.data.id !== id) {
        return;
      }
      cleanup();
      if (event.data.pdf) {
        resolve(event.data.pdf);
      } else {
        reject(new Error(event.data.error ?? 'Typst produced no output'));
      }
    };
    const onError = (event: ErrorEvent): void => {
      cleanup();
      reject(new Error(event.message || 'The Typst worker failed'));
    };
    const timer = setTimeout(() => {
      cleanup();
      // A stuck compilation cannot be interrupted. Drop this worker,
      // and let the next export operation start a new one as needed.
      target.terminate();
      worker = null;
      reject(
        new Error(
          `Typst did not finish within ${COMPILE_TIMEOUT_MS / 1000} seconds. ` +
            'The notebook may contain Typst code that never ends.'
        )
      );
    }, COMPILE_TIMEOUT_MS);

    target.addEventListener('message', onMessage);
    target.addEventListener('error', onError);
    target.postMessage(request);
  });
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
