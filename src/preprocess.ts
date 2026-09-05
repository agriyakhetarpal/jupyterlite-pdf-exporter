// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import type {
  IBaseOutput,
  ICodeCell,
  IMimeBundle,
  INotebookContent
} from '@jupyterlab/nbformat';

/**
 * A list of MIME types that Callisto can render
 */
const RENDERABLE_MIME_TYPES = new Set([
  'image/svg+xml',
  'image/png',
  'image/jpeg',
  'image/gif',
  'text/markdown',
  'text/latex',
  'text/plain',
  'text/html',
  'application/json'
]);

/**
 * Elements that only work in a browser. This can be embedded pages, form
 * controls, scripts, and inline SVG icon sheets such as the ones emitted by
 * xarray and Vega
 */
const INTERACTIVE_ELEMENTS = 'iframe, input, script, svg';

/**
 * A placeholder that we show for outputs whose representation is not renderable
 */
export const UNAVAILABLE_OUTPUT = '[Output not available in PDF]';

/**
 * A code cell output we can rewrite in place. nbformat's IOutput union pins
 * output_type to a literal per member, which blocks reassigning it. This shape
 * is assignable from every IOutput and lets us rewrite output_type and data.
 */
interface IMutableOutput extends IBaseOutput {
  data?: IMimeBundle;
}

/**
 * Join a multiline MIME value into a single string.
 * @param value - the MIME value to join
 * @returns the joined string, or undefined if the value is not a string or string array
 */
function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
    return value.join('');
  }
  return undefined;
}

/**
 * Clean an HTML output for rendering. Returns undefined when the
 * HTML has nothing to show once browser-only parts are gone.
 *
 * @param html - the HTML output to clean
 * @returns the cleaned HTML, or undefined if it has nothing to show
 */
export function sanitizeHtml(html: string): string | undefined {
  // Parsing as a document never runs scripts, and lets us drop elements
  // such as the style blocks that pandas ships with its tables
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (doc.querySelector(INTERACTIVE_ELEMENTS)) {
    return undefined;
  }
  doc.querySelectorAll('style').forEach(element => element.remove());
  if (!doc.body.textContent?.trim()) {
    return undefined;
  }
  return doc.body.innerHTML;
}

/**
 * Rewrite a notebook, in place, in a way such that Callisto renders it well:
 *
 * - `update_display_data` outputs become `display_data`, since nbformat does
 *   not store the former as an output type
 * - HTML outputs lose their style blocks, and HTML that only works in a
 *   browser is dropped so the plain text fallback is used instead
 * - Outputs with no renderable MIME type get a plain text placeholder
 */
export function preprocessNotebook(notebook: INotebookContent): void {
  for (const cell of notebook.cells) {
    if (
      cell.cell_type !== 'code' ||
      !Array.isArray((cell as ICodeCell).outputs)
    ) {
      continue;
    }
    for (const output of (cell as ICodeCell).outputs as IMutableOutput[]) {
      if (output.output_type === 'update_display_data') {
        output.output_type = 'display_data';
      }
      const data = output.data;
      if (data === undefined) {
        continue;
      }

      // Callisto would evaluate this as Typst code, so leave it to the
      // plain text fallback
      delete data['text/vnd.typst'];

      const html = asString(data['text/html']);
      if (html !== undefined) {
        const cleaned = sanitizeHtml(html);
        if (cleaned === undefined) {
          delete data['text/html'];
        } else {
          data['text/html'] = cleaned;
        }
      }

      const renderable = Object.keys(data).some(mime =>
        RENDERABLE_MIME_TYPES.has(mime)
      );
      if (!renderable) {
        data['text/plain'] = UNAVAILABLE_OUTPUT;
      }
    }
  }
}
