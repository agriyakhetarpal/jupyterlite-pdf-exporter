// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

declare module 'pandoc-wasm' {
  export const convert: (
    options: Record<string, unknown>,
    stdin: string | null,
    files: Record<string, string | Blob>
  ) => Promise<{
    stdout: string;
    stderr: string;
    mediaFiles?: Record<string, string | Blob>;
  }>;
}

declare module '@myriaddreamin/typst-all-in-one.ts' {}

declare module '*.tar.gz' {
  const url: string;
  export default url;
}
