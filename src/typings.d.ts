// Copyright (c) Agriya Khetarpal
// SPDX-License-Identifier: BSD-3-Clause

declare module '*.tar.gz' {
  const url: string;
  export default url;
}

declare module '*.typ' {
  const source: string;
  export default source;
}

declare module '@myriaddreamin/typst-ts-web-compiler/wasm' {
  const url: string;
  export default url;
}
