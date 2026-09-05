// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import type { IPdfExportSettings } from './settings';

/**
 * The version of Callisto we import.
 * Keep in sync with the version in scripts/vendor_typst_packages.py
 */
export const CALLISTO_VERSION = '0.3.0';

/**
 * Scale down tables wider than the text area to fit the page.
 * This is adapted from what Pandoc does in its HTML writer.
 */
const FIT_TABLES = `
#show table: it => layout(size => {
  let width = measure(it).width
  if width > size.width {
    scale(x: size.width / width * 100%, y: size.width / width * 100%, reflow: true, it)
  } else {
    it
  }
})`;

/**
 * Markdown images that are neither attachments nor data URLs, such as external
 * images at a URL, point at files the compiler cannot reach from within browser
 * contexts. Callisto panics at such images. We replace them with a note instead
 * to avoid failing the PDF export.
 */
const IMAGE_HANDLER = `
#let image-markdown(data, ctx: none, ..args) = {
  if type(data) == str and not data.starts-with("attachment:") and not data.starts-with("data:") {
    return text(fill: gray, size: 0.9em)[[Image not available: #raw(data)]]
  }
  (callisto.default-handlers.at("image-markdown"))(data, ctx: ctx, ..args)
}`;

/**
 * Quote a value as a Typst string literal.
 *
 * @param value - the string value to quote
 * @returns the quoted string
 */
function typstString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Check that a value is a Typst length such as "2.5cm".
 * @param value - the length to check
 * @param name - what the value is, for the error message
 * @returns the trimmed length
 * @throws if the value is not a length with a unit
 */
function typstLength(value: string, name: string): string {
  const length = value.trim();
  if (!/^\d*\.?\d+(pt|mm|cm|in|em)$/.test(length)) {
    throw new Error(
      `Invalid ${name} "${value}". Expected a length such as "12pt" or "2.5cm"`
    );
  }
  return length;
}

/**
 * Normalise a colour to "#rrggbb" form.
 * @param value - the colour value to normalise
 * @returns the normalised colour value
 * @throws if the value is not a valid hex colour
 */
function typstColor(value: string): string {
  const hex = value.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3,8}$/.test(hex)) {
    throw new Error(`Invalid colour "${value}". Expected a hex value`);
  }
  return `rgb(${typstString('#' + hex)})`;
}

/**
 * Build the Typst document that renders a notebook through Callisto
 * @param settings - the user settings
 * @param notebookPath - the path of the notebook in the compiler's filesystem
 * @returns the Typst document as a string
 */
export function buildTypstWrapper(
  settings: IPdfExportSettings,
  notebookPath = 'notebook.ipynb'
): string {
  const lines: string[] = [
    `#import "@preview/callisto:${CALLISTO_VERSION}"`,
    ''
  ];

  const page: string[] = [];
  if (settings.pageSize) {
    page.push(`paper: ${typstString(settings.pageSize)}`);
  }
  const margin = (['top', 'bottom', 'left', 'right'] as const)
    .filter(side => settings.margin?.[side])
    .map(
      side => `${side}: ${typstLength(settings.margin[side], `${side} margin`)}`
    );
  if (margin.length > 0) {
    page.push(`margin: (${margin.join(', ')})`);
  }
  page.push(`numbering: ${settings.pageNumbers ? '"1"' : 'none'}`);
  lines.push(`#set page(${page.join(', ')})`);

  const text: string[] = [];
  if (settings.mainFont) {
    text.push(`font: ${typstString(settings.mainFont)}`);
  }
  if (settings.fontSize) {
    text.push(`size: ${typstLength(settings.fontSize, 'font size')}`);
  }
  if (text.length > 0) {
    lines.push(`#set text(${text.join(', ')})`);
  }

  const leading = settings.lineSpacing || 1;
  if (!Number.isFinite(leading) || leading <= 0) {
    throw new Error(
      `Invalid line spacing "${settings.lineSpacing}". Expected a positive number`
    );
  }
  lines.push(`#set par(justify: true, leading: ${leading} * 0.65em)`);

  if (settings.linkColor.trim()) {
    lines.push(`#show link: set text(fill: ${typstColor(settings.linkColor)})`);
  }
  if (settings.numberSections) {
    lines.push('#set heading(numbering: "1.")');
  }

  if (!['notebook', 'neat', 'plain'].includes(settings.theme)) {
    throw new Error(
      `Unknown theme "${settings.theme}". Expected "notebook", "neat", or "plain"`
    );
  }

  lines.push(FIT_TABLES, IMAGE_HANDLER, '');

  if (settings.tableOfContents) {
    lines.push('#outline()', '');
  }

  lines.push(
    '#callisto.render(',
    `  nb: path(${typstString(notebookPath)}),`,
    `  theme: ${typstString(settings.theme)},`,
    '  ignore-wrong-format: true,',
    // Markdown can carry Typst code in HTML comments. Do not run it
    '  cmarker: (raw-typst: false),',
    '  handlers: ("image-markdown": image-markdown),',
    ')',
    ''
  );

  return lines.join('\n');
}
