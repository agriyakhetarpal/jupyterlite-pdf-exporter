// This is a custom webpack configuration for the JupyterLab extension builder.
// The bundled Typst package archives are emitted as static assets next to the
// bundle and fetched at runtime.
module.exports = {
  module: {
    rules: [
      { test: /\.tar\.gz$/, type: 'asset/resource' },
      // The Typst compiler binary is fetched by the worker at runtime
      { test: /\.wasm$/, type: 'asset/resource' },
      // The Typst wrapper is inlined as a string
      { test: /\.typ$/, type: 'asset/source' }
    ]
  }
};
