// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import type { Contents } from '@jupyterlab/services';

import { BaseExporter } from '@jupyterlite/services';

import { pdfExportProgress } from './progress';

// Typst compiler creates a global $typst
declare const $typst: {
  resetShadow: () => void;
  mapShadow: (path: string, data: Uint8Array) => void;
  pdf: (options: { mainFilePath: string }) => Promise<Uint8Array>;
};

let pandocConvert:
  | ((
      options: Record<string, unknown>,
      stdin: string | null,
      files: Record<string, string | Blob>
    ) => Promise<{
      stdout: string;
      stderr: string;
      mediaFiles?: Record<string, string | Blob>;
    }>)
  | null = null;
let pandocLoadingPromise: Promise<void> | null = null;
let typstLoaded = false;
let typstLoadingPromise: Promise<void> | null = null;

/**
 * A PDF exporter for JupyterLite notebooks using pandoc-wasm and Typst.
 *
 * The pipeline is as follows:
 * Notebook JSON ➡️ pandoc (ipynb ➡️ typst) ➡️ Typst markup ➡️ typst-ts ➡️ PDF
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
    const notebook = model.content;

    try {
      // step 1: load both pandoc and typst in parallel on first use
      pdfExportProgress.start('Preparing PDF export…');
      await Promise.all([loadPandoc(), loadTypst()]);

      // step 2: preprocess and convert notebook to Typst via pandoc-wasm
      pdfExportProgress.update('Converting notebook…');
      const mathMap = preprocessNotebook(notebook as Record<string, unknown>);
      const notebookJson = JSON.stringify(notebook);
      const files: Record<string, string | Blob> = {
        'notebook.ipynb': notebookJson
      };

      const result = await pandocConvert!(
        {
          from: 'ipynb',
          to: 'typst',
          standalone: true,
          'extract-media': '.',
          'input-files': ['notebook.ipynb']
        },
        null,
        files
      );

      if (result.stderr && result.stderr.includes('ERROR')) {
        throw new Error(`Pandoc conversion failed: ${result.stderr}`);
      }

      // step 3: splice converted Typst math back into the Typst source
      const typstContent =
        mathMap.size > 0
          ? await postprocessTypst(result.stdout, mathMap)
          : result.stdout;

      // step 4: compile the Typst to a PDF
      pdfExportProgress.update('Generating PDF…');
      $typst.resetShadow();
      const typstBytes = new TextEncoder().encode(typstContent);
      $typst.mapShadow('/main.typ', typstBytes);

      // We also need to map extracted media files (e.g., matplotlib plots) into Typst's filesystem
      // TODO investigate if there's a more efficient way to pass these through without needing to go
      // through JS memory, especially for large files
      // TODO investigate if ipywidgets and other sorts of media work or if we need special handling for them
      if (result.mediaFiles) {
        for (const [filename, content] of Object.entries(result.mediaFiles)) {
          let bytes: Uint8Array;
          if (content instanceof Blob) {
            bytes = new Uint8Array(await content.arrayBuffer());
          } else if (typeof content === 'string') {
            bytes = new TextEncoder().encode(content);
          } else {
            continue;
          }
          $typst.mapShadow('/' + filename, bytes);
        }
      }

      const pdfData = await $typst.pdf({ mainFilePath: '/main.typ' });

      // This should not really happen since we'll at least have the PDF header
      // and at least one cell in the notebook (even if it's empty)
      if (!pdfData || pdfData.length === 0) {
        throw new Error('Typst produced empty PDF output');
      }

      // step 5: download the PDF in the browser
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
}

/**
 * Lazy load the pandoc-wasm module. This is a large dependency, so
 * we only want to load it when the user actually tries to export a
 * notebook as PDF for the first time. Subsequent calls should reuse
 * the loaded module.
 * @returns – a promise that resolves when the pandoc-wasm module is loaded.
 */
async function loadPandoc(): Promise<void> {
  if (pandocConvert) {
    return;
  }
  if (pandocLoadingPromise) {
    return pandocLoadingPromise;
  }

  pandocLoadingPromise = (async () => {
    const pandocModule = await import('pandoc-wasm');
    pandocConvert = pandocModule.convert;
  })();

  return pandocLoadingPromise;
}

/**
 * Lazy load the Typst compiler module. This package sets the global
 * $typst when imported as a side effect.
 * @returns – a promise that resolves when the Typst compiler is loaded.
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
  })();

  return typstLoadingPromise;
}

type IpynbOutput = {
  output_type: string;
  data?: Record<string, string | string[] | Record<string, unknown>>;
  [key: string]: unknown;
};

/**
 * This function pre-processes a notebook object in-place before passing it to
 * Pandoc, and returns a map of placeholder ➡️ LaTeX math content.
 *
 * Pandoc's IPyNB reader maps every MIME type to a pandoc block:
 *   text/latex, text/html ➡️ raw blocks, dropped by the Typst writer
 *   text/plain            ➡️ a code block, the only format that survives
 *
 * The Math outputs are handled via a very janky two-stage workaround, together
 * with postprocessTypst:
 *   1. Each text/latex output is stored in the returned map and
 *      text/plain is overwritten with a unique placeholder string, so
 *      the placeholder survives Pandoc's conversion as a code block.
 *   2. postprocessTypst converts each placeholder's LaTeX to Typst math
 *      by running Pandoc on "$$LATEX$$" (Markdown ➡️ Typst), which
 *      produces a native DisplayMath AST node that the Typst writer
 *      converts via TeXMath, then splices it into the Typst source.
 *
 * IPython.display.Math wraps its LaTeX in "$\displaystyle …$"; that
 * wrapper is stripped before the content is stored.
 *
 * update_display_data outputs are also converted to display_data here,
 * since the nbformat spec does not include update_display_data as a
 * stored output type and Pandoc seems to ignore it?
 */
function preprocessNotebook(
  notebook: Record<string, unknown>
): Map<string, string> {
  const mathMap = new Map<string, string>();
  const cells = notebook.cells as Array<Record<string, unknown>>;
  let counter = 0;

  for (const cell of cells) {
    if (!Array.isArray(cell.outputs)) {
      continue;
    }

    for (const output of cell.outputs as IpynbOutput[]) {
      // Defensive fix: update_display_data → display_data
      if (output.output_type === 'update_display_data') {
        output.output_type = 'display_data';
      }

      const data = output.data;

      // Pandoc's ipynb reader expects every MIME-bundle value to be a string
      // or array of strings. Some MIME types (e.g. application/geo+json) store
      // their payload as a nested JSON object, which makes Pandoc bail out with
      // a confusing "expected nbformat <= 3" decoding error. Serialise any such
      // values to a JSON string so Pandoc can parse the notebook safely.
      if (data) {
        for (const mimeType of Object.keys(data)) {
          const value = data[mimeType];
          if (
            value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value)
          ) {
            data[mimeType] = JSON.stringify(value);
          }
        }
      }

      if (data?.['text/latex'] === undefined) {
        continue;
      }

      const latex = data['text/latex'] as string | string[];
      const raw = (Array.isArray(latex) ? latex.join('') : latex).trim();

      // IPython.display.Math wraps content in "$\displaystyle …$" (single-dollar,
      // inline delimiters). Strip the wrapper so we have the bare LaTeX expression.
      const displayStyleMatch = raw.match(
        /^\$\\displaystyle\s*([\s\S]*?)\s*\$$/
      );
      const mathContent = displayStyleMatch ? displayStyleMatch[1] : raw;

      const placeholder = `PDFEXPORTER_MATH_${counter++}`;
      mathMap.set(placeholder, mathContent);
      data['text/plain'] = placeholder;
      delete data['text/latex'];
    }
  }

  return mathMap;
}

/**
 * This function post-processes Pandoc's Typst output to replace math placeholderswith
 * Typst math.
 *
 * For each placeholder, we:
 *  1. Run Pandoc on "$$LATEX_CONTENT$$" (Markdown with display math) ➡️ Typst.
 *     Pandoc's Markdown reader creates a native DisplayMath AST node from the
 *     $$…$$ delimiters, and the Typst writer then converts it via TeXMath.
 *  2. Find the code block in the Typst source that contains the placeholder
 *     (Pandoc renders text/plain as a fenced raw block: ```\nPLACEHOLDER\n```).
 *  3. Replace that entire code block with the converted Typst math.
 */
async function postprocessTypst(
  typstContent: string,
  mathMap: Map<string, string>
): Promise<string> {
  for (const [placeholder, latexContent] of mathMap) {
    // Convert the LaTeX expression to Typst math using pandoc
    let typstMath: string;
    try {
      const mathResult = await pandocConvert!(
        { from: 'markdown', to: 'typst', standalone: false },
        `$$\n${latexContent}\n$$`,
        {}
      );
      typstMath = mathResult.stdout.trim();
    } catch {
      // If pandoc cannot convert the expression, fall back to a literal
      // LaTeX code block so at least the source is visible.
      typstMath = `\`\`\`latex\n${latexContent}\n\`\`\``;
    }

    // Pandoc's Typst writer renders a CodeBlock as:
    //   ```\nCONTENT\n```
    // Find the fenced block whose content is exactly our placeholder and
    // replace the whole block (fence lines included) with the Typst math.
    const idx = typstContent.indexOf(placeholder);
    if (idx === -1) {
      continue;
    }

    const fenceOpen = typstContent.lastIndexOf('`', idx);
    // Walk back to the start of the opening fence (which is "```")
    let fenceStart = fenceOpen;
    while (fenceStart > 0 && typstContent[fenceStart - 1] === '`') {
      fenceStart--;
    }

    // Find the closing fence after the placeholder
    const afterPlaceholder = idx + placeholder.length;
    const closingFenceStart = typstContent.indexOf('`', afterPlaceholder);
    if (closingFenceStart === -1) {
      continue;
    }
    let closingFenceEnd = closingFenceStart;
    while (
      closingFenceEnd + 1 < typstContent.length &&
      typstContent[closingFenceEnd + 1] === '`'
    ) {
      closingFenceEnd++;
    }

    typstContent =
      typstContent.slice(0, fenceStart) +
      typstMath +
      '\n' +
      typstContent.slice(closingFenceEnd + 1);
  }

  return typstContent;
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
