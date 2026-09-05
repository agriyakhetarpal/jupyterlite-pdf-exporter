// This is a custom webpack configuration for the JupyterLab extension builder.
// The bundled Typst package archives are emitted as static assets next to the
// bundle and fetched at runtime.
module.exports = {
  module: {
    rules: [{ test: /\.tar\.gz$/, type: 'asset/resource' }]
  }
};
