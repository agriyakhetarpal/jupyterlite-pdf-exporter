// This is a custom webpack configuration for the JupyterLab extension builder.
// WASM binaries and the bundled Typst package archives are emitted as static
// assets next to the bundle and fetched at runtime.
module.exports = {
  module: {
    rules: [{ test: /\.(wasm|tar\.gz)$/, type: 'asset/resource' }]
  }
};
