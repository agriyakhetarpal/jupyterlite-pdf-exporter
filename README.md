# `jupyterlite-pdf-exporter`

[![Github Actions build status](https://github.com/agriyakhetarpal/jupyterlite-pdf-exporter/workflows/Build/badge.svg)](https://github.com/agriyakhetarpal/jupyterlite-pdf-exporter/actions/workflows/build.yml)
[![Try PDF exporter in JupyterLite](https://jupyterlite.rtfd.io/en/latest/_static/badge.svg)](https://agriyakhetarp.al/jupyterlite-pdf-exporter/)

A serverless PDF exporter for JupyterLite based on WebAssembly distributions of Pandoc and Typst. This JupyterLite extension registers a
PDF exporter with [JupyterLite's `INbConvertExporters` interface](https://jupyterlite.readthedocs.io/en/stable/howto/extensions/custom-exporters.html).

## Usage

- Install this extension in your JupyterLite deployment via `pip install jupyterlite-pdf-exporter` and rebuild your JupyterLite distribution.
- Open a notebook in JupyterLite, click on the "File" menu, and select "Save and Export Notebook As" > "PDF". The PDF file will be downloaded to your local machine at a location of your choice.

## Requirements

- JupyterLite 0.7.0 and later
- A modern web browser with support for WebAssembly and Web Workers (e.g., Chrome, Firefox, Safari, Edge, and so on). All browsers supported by JupyterLite should work with this extension.
- The extension relies on WebAssembly distributions of Pandoc and Typst. These distributions are quite large (over 50 MiB) and may take some time to download and initialise when the extension is first used. For a better user experience, it is recommended to use this extension in an environment with a stable and reasonably fast internet connection.

## Installation

To install the extension into your JupyterLite deployment, execute:

```bash
pip install jupyterlite-pdf-exporter
```

and rebuild your JupyterLite distribution.

## Uninstalling the extension

To remove the extension from your JupyterLite deployment, execute:

```bash
pip uninstall jupyterlite-pdf-exporter
```

and rebuild your JupyterLite distribution.

## License

The source code of this JupyterLite extension is licensed under the terms of the BSD-3-Clause "New" or "Revised" License (`BSD-3-Clause`; see the [LICENSE](LICENSE) file for details).

The distributions of this JupyterLite extension on the `npm` and `PyPI` package registries are licensed under the terms of the GNU General Public License version 2.0 (GPL-2.0) or later (`GPL-2.0-or-later`). Please see the [LICENSE.pandoc](LICENSE.pandoc) file for details.

The WebAssembly/JavaScript distribution of Typst, `@myriaddreamin/typst-all-in-one`, is licensed under the terms of the Apache License 2.0 (`Apache-2.0`). Please see the [LICENSE.typst](LICENSE.typst) file for details.

### Why?

The WebAssembly distribution of Pandoc, through its dependency on the `pandoc-wasm` project on the `npm` package registry, is licensed under the terms of the GNU General Public License version 2.0 (`GPL-2.0-or-later`). Binary distributions of this extension bundle the `pandoc.wasm` file, and as a result, are regarded as derivative works of the WebAssembly distribution of Pandoc.

### More details

For an overview of the licenses of all the JavaScript dependencies of this extension at runtime, please navigate to your JupyterLite deployment > "Help" menu > "Licenses" after installing and rebuilding it.

## Thanks 💛

This project would not have been possible without the following open source projects:

- [JupyterLite](https://jupyterlite.rtfd.io/en/latest/): A JupyterLab distribution that runs entirely in the web browser, powered by WebAssembly and Web Workers.
- [Pandoc](https://pandoc.org/): A universal document converter that supports a wide variety of input and output formats, including Jupyter notebooks and PDF.
- [Typst](https://typst.app/): A modern typesetting system that provides high-quality PDF output and a user-friendly syntax for document design.
- [pandoc-wasm](https://www.npmjs.com/package/pandoc-wasm): A WebAssembly distribution of Pandoc that allows it to run in web browsers and other JavaScript environments.
- [@myriaddreamin/typst-all-in-one](https://www.npmjs.com/package/@myriaddreamin/typst-all-in-one): A WebAssembly distribution of Typst that allows it to run in web browsers and other JavaScript environments.
