// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import type { IPdfExportSettings } from './settings';

/**
 * A length defined as a number and a unit, such as 2.5cm
 */
export interface ITypstLength {
  value: number;
  unit: string;
}

/**
 * The contents of settings.json, read by typst/wrapper.typ.
 * A null means that we leave it at the Typst default.
 */
export interface ITypstSettings {
  pageSize: string | null;
  fontSize: ITypstLength | null;
  margin: {
    top: ITypstLength | null;
    bottom: ITypstLength | null;
    left: ITypstLength | null;
    right: ITypstLength | null;
  };
  mainFont: string | null;
  pageNumbers: boolean;
  tableOfContents: boolean;
  numberSections: boolean;
  lineSpacing: number;
  linkColor: string | null;
  theme: string;
  promptGutter: string;
  hideInputs: boolean;
  hideOutputs: boolean;
  ansiColors: boolean;
}

/**
 * Split a length such as "2.5cm" into its number and unit. Note that Typst
 * checks the unit itself, this only has to separate the two.
 *
 * @param value - the length as typed in the settings
 * @param name - what the value is, for the error message
 * @returns the split length, or null if the value is empty
 * @throws if the value is not a number followed by a unit
 */
export function parseLength(value: string, name: string): ITypstLength | null {
  const text = value.trim();
  if (!text) {
    return null;
  }
  const match = /^(\d*\.?\d+)\s*([a-z]+)$/i.exec(text);
  if (!match) {
    throw new Error(
      `Invalid ${name} "${value}". Expected a length such as "12pt" or "2.5cm"`
    );
  }
  return { value: Number(match[1]), unit: match[2].toLowerCase() };
}

/**
 * Turn the user settings into data read by the Typst wrapper
 *
 * @param settings - the user settings
 * @returns the settings as the wrapper expects them
 */
export function buildTypstSettings(
  settings: IPdfExportSettings
): ITypstSettings {
  const linkColor = settings.linkColor.trim().replace(/^#/, '');
  return {
    pageSize: settings.pageSize.trim() || null,
    fontSize: parseLength(settings.fontSize, 'font size'),
    margin: {
      top: parseLength(settings.margin.top, 'top margin'),
      bottom: parseLength(settings.margin.bottom, 'bottom margin'),
      left: parseLength(settings.margin.left, 'left margin'),
      right: parseLength(settings.margin.right, 'right margin')
    },
    mainFont: settings.mainFont.trim() || null,
    pageNumbers: settings.pageNumbers,
    tableOfContents: settings.tableOfContents,
    numberSections: settings.numberSections,
    lineSpacing: settings.lineSpacing || 1,
    linkColor: linkColor ? `#${linkColor}` : null,
    theme: settings.theme,
    promptGutter: settings.promptGutter,
    hideInputs: settings.hideInputs,
    hideOutputs: settings.hideOutputs,
    ansiColors: settings.ansiColors
  };
}
