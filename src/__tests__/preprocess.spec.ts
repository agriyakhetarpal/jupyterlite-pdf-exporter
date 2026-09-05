// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

import type {
  ICodeCell,
  IMimeBundle,
  INotebookContent,
  IOutput
} from '@jupyterlab/nbformat';

import {
  preprocessNotebook,
  sanitizeHtml,
  UNAVAILABLE_OUTPUT
} from '../preprocess';

function notebookWith(...outputs: IOutput[]): INotebookContent {
  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {},
    cells: [
      {
        cell_type: 'code',
        source: 'x',
        metadata: {},
        execution_count: 1,
        outputs
      }
    ]
  };
}

function firstOutput(notebook: INotebookContent): IOutput {
  return (notebook.cells[0] as ICodeCell).outputs[0];
}

function firstData(notebook: INotebookContent): IMimeBundle {
  return (firstOutput(notebook) as { data: IMimeBundle }).data;
}

describe('sanitizeHtml', () => {
  it('strips style blocks such as the ones pandas emits', () => {
    const html =
      '<div><style scoped>.dataframe { color: red; }</style><table><tr><td>1</td></tr></table></div>';
    expect(sanitizeHtml(html)).toBe(
      '<div><table><tr><td>1</td></tr></table></div>'
    );
  });

  it('drops HTML with embedded pages, form controls, scripts, or inline SVG', () => {
    expect(sanitizeHtml('<iframe srcdoc="..."></iframe>')).toBeUndefined();
    expect(sanitizeHtml('<div><input type="checkbox"></div>')).toBeUndefined();
    expect(
      sanitizeHtml('<div id="viz"></div><script>draw()</script>')
    ).toBeUndefined();
    expect(
      sanitizeHtml('<svg><symbol id="i"/></svg><table></table>')
    ).toBeUndefined();
  });

  it('drops HTML with nothing left to show', () => {
    expect(sanitizeHtml('<style>a {}</style><div></div>')).toBeUndefined();
  });

  it('keeps ordinary HTML', () => {
    expect(sanitizeHtml('<b>bold</b>')).toBe('<b>bold</b>');
  });
});

describe('preprocessNotebook', () => {
  it('turns update_display_data into display_data', () => {
    const notebook = notebookWith({
      output_type: 'update_display_data',
      data: { 'text/plain': 'x' },
      metadata: {}
    });
    preprocessNotebook(notebook);
    expect(firstOutput(notebook).output_type).toBe('display_data');
  });

  it('cleans HTML outputs and joins multiline values', () => {
    const notebook = notebookWith({
      output_type: 'execute_result',
      execution_count: 1,
      data: {
        'text/html': ['<style>a {}</style>', '<b>x</b>'],
        'text/plain': 'x'
      },
      metadata: {}
    });
    preprocessNotebook(notebook);
    expect(firstOutput(notebook).data).toEqual({
      'text/html': '<b>x</b>',
      'text/plain': 'x'
    });
  });

  it('drops browser-only HTML so the plain text fallback is used', () => {
    const notebook = notebookWith({
      output_type: 'execute_result',
      execution_count: 1,
      data: { 'text/html': '<iframe></iframe>', 'text/plain': 'Map' },
      metadata: {}
    });
    preprocessNotebook(notebook);
    expect(firstOutput(notebook).data).toEqual({ 'text/plain': 'Map' });
  });

  it('adds a placeholder when nothing can be rendered', () => {
    const notebook = notebookWith({
      output_type: 'display_data',
      data: { 'application/vnd.plotly.v1+json': { data: [] } },
      metadata: {}
    });
    preprocessNotebook(notebook);
    expect(firstData(notebook)['text/plain']).toBe(UNAVAILABLE_OUTPUT);
  });

  it('leaves outputs with images alone', () => {
    const notebook = notebookWith({
      output_type: 'display_data',
      data: { 'image/png': 'iVBOR', 'text/plain': '<Figure>' },
      metadata: {}
    });
    preprocessNotebook(notebook);
    expect(firstOutput(notebook).data).toEqual({
      'image/png': 'iVBOR',
      'text/plain': '<Figure>'
    });
  });

  it('ignores markdown cells and stream outputs', () => {
    const notebook = notebookWith({
      output_type: 'stream',
      name: 'stdout',
      text: 'hi'
    });
    notebook.cells.push({ cell_type: 'markdown', source: '# t', metadata: {} });
    expect(() => preprocessNotebook(notebook)).not.toThrow();
  });
});
