// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

declare module '@myriaddreamin/typst-all-in-one.ts' {}

declare module '*.tar.gz' {
  const url: string;
  export default url;
}
