// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

/**
 * The Web Worker that runs the Typst compiler, because we don't want to
 * block the main thread due to the status widget reporting progress.
 */

import {
  CompileFormatEnum,
  createTypstCompiler
} from '@myriaddreamin/typst.ts/compiler';

import type { TypstCompiler } from '@myriaddreamin/typst.ts/compiler';

import { MemoryAccessModel } from '@myriaddreamin/typst.ts/fs/memory';

import {
  withAccessModel,
  withPackageRegistry
} from '@myriaddreamin/typst.ts/options.init';

import compilerWasmUrl from '@myriaddreamin/typst-ts-web-compiler/wasm';

import { BundledPackageRegistry } from './typst-packages';

/**
 * A request from pdf.ts. The files to place in the compiler's
 * filesystem, keyed by absolute path. The main file is /main.typ.
 */
export interface ICompileRequest {
  id: number;
  files: Record<string, string>;
}

/**
 * The reply, with either the PDF bytes or an error message.
 */
export interface ICompileResponse {
  id: number;
  pdf?: Uint8Array;
  error?: string;
}

interface IWorkerScope {
  onmessage: ((event: MessageEvent<ICompileRequest>) => void) | null;
  postMessage(message: ICompileResponse, transfer?: Transferable[]): void;
}

const scope = self as unknown as IWorkerScope;

let compilerPromise: Promise<TypstCompiler> | null = null;

/**
 * Load the compiler and the bundled packages once per worker.
 * @returns - a promise that resolves to the Typst compiler instance
 */
function getCompiler(): Promise<TypstCompiler> {
  compilerPromise ??= (async () => {
    const accessModel = new MemoryAccessModel();
    const registry = new BundledPackageRegistry(accessModel);
    await registry.load();
    const compiler = createTypstCompiler();
    await compiler.init({
      getModule: () => compilerWasmUrl,
      beforeBuild: [withAccessModel(accessModel), withPackageRegistry(registry)]
    });
    return compiler;
  })();
  return compilerPromise;
}

/**
 * Compile the given files in the worker and return the PDF bytes.
 * @param files - a record of absolute paths to file contents, with /main.typ as the main file
 * @returns - a promise that resolves to the compiled PDF bytes
 */
async function compile(files: Record<string, string>): Promise<Uint8Array> {
  const compiler = await getCompiler();
  const encoder = new TextEncoder();
  compiler.resetShadow();
  for (const [path, content] of Object.entries(files)) {
    compiler.mapShadow(path, encoder.encode(content));
  }
  const { result, diagnostics } = await compiler.compile({
    mainFilePath: '/main.typ',
    format: CompileFormatEnum.pdf,
    diagnostics: 'unix'
  });
  if (!result || result.length === 0) {
    const details = (diagnostics ?? []).join('\n');
    throw new Error(`Typst could not compile the notebook\n${details}`);
  }
  return result;
}

/**
 * Handle a message from pdf.ts, compile the files, and post back the result.
 * @param event - the message event containing the compile request
 */
scope.onmessage = async event => {
  const { id, files } = event.data;
  try {
    const pdf = await compile(files);
    scope.postMessage({ id, pdf }, [pdf.buffer]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    scope.postMessage({ id, error: message });
  }
};
