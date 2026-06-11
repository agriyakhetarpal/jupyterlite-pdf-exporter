# `jupyterlite-pdf-exporter`, version 0.1.0

[![Github Actions build status](https://github.com/agriyakhetarpal/jupyterlite-pdf-exporter/workflows/Build/badge.svg)](https://github.com/agriyakhetarpal/jupyterlite-pdf-exporter/actions/workflows/build.yml)
[![Try PDF exporter in JupyterLite](https://jupyterlite.rtfd.io/en/latest/_static/badge.svg)](https://agriyakhetarp.al/jupyterlite-pdf-exporter/)

A serverless PDF exporter for JupyterLite based on WebAssembly distributions of [Pandoc](https://pandoc.org/app) and [Typst](https://typst.org/). This JupyterLite extension registers a
PDF exporter with [JupyterLite's `INbConvertExporters` interface](https://jupyterlite.readthedocs.io/en/stable/howto/extensions/custom-exporters.html).

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

## Usage

- Install this extension in your JupyterLite deployment via `pip install jupyterlite-pdf-exporter` and rebuild your JupyterLite distribution.
- Open a notebook in JupyterLite, click on the "File" menu, and select "Save and Export Notebook As" > "PDF". The PDF file will be downloaded to your local machine at a location of your choice.

### Requirements

- JupyterLite 0.7.0 and later
- A modern web browser with support for WebAssembly and Web Workers (e.g., Chrome, Firefox, Safari, Edge, and so on). All browsers supported by JupyterLite should work with this extension.
- The extension relies on WebAssembly distributions of Pandoc and Typst. These distributions are quite large (over 50 MiB) and may take some time to download and initialise when the extension is first used. For a better user experience, it is recommended to use this extension in an environment with a stable and reasonably fast internet connection.

### Customising the PDFs

It is also possible to change the look and feel of the exported PDF(s) through the settings.

To change the settings for yourself, open the "Settings Editor" in JupyterLite from the "Settings" menu and pick "JupyterLite PDF Exporter". The form lets you set the page size, font, margins, and more. The new settings apply the next time you export a notebook. Choosing the settings per-notebook is currently not implemented.

If you build a JupyterLite site for other people, you can set the defaults for everyone. For this, you may add an entry for `jupyterlite-pdf-exporter:plugin` to an `overrides.json` file in your build, or to the `settingsOverrides` field in your `jupyter-lite.json` file. Those values become the starting point for every user, who can still change them in their own Settings Editor.

Only the fonts that come bundled with the Typst compiler are available.

Here is a table of what each setting changes. The "Key" column is the name you write in `overrides.json` or in `settingsOverrides`. The "Pandoc mapping" column shows where the value ends up. a "variable" is passed as a [Pandoc template variable](https://pandoc.org/MANUAL.html#variables) and an "option" is a top-level [Pandoc option](https://pandoc.org/MANUAL.html#general-options). You do not need to know these to use the settings, but they are handy if you want to read the Pandoc and Typst docs.

| Setting           | Key               | What it does                               | Pandoc mapping             | Example value(s)     |
| ----------------- | ----------------- | ------------------------------------------ | -------------------------- | -------------------- |
| Page size         | `pageSize`        | Sets the paper size of the PDF             | variable `papersize`       | `a4`, `us-letter`    |
| Font size         | `fontSize`        | Sets the base text size                    | variable `fontsize`        | `10pt`, `12pt`       |
| Margins           | `margin`          | Sets the space around the page edges       | variable `margin`          | `{ "top": "2.5cm" }` |
| Main font         | `mainFont`        | Picks the body font from the bundled fonts | variable `mainfont`        | `Libertinus Serif`   |
| Page numbers      | `pageNumbers`     | Turns page numbers on or off               | variable `page-numbering`  | `true` (default)     |
| Table of contents | `tableOfContents` | Adds a contents list at the start          | option `table-of-contents` | `false` (default)    |
| Number sections   | `numberSections`  | Adds numbers to headings                   | option `number-sections`   | `false` (default)    |
| Line spacing      | `lineSpacing`     | Sets the spacing between lines             | variable `linestretch`     | `1` (default), `1.5` |
| Link color        | `linkColor`       | Sets the colour used for links             | variable `linkcolor`       | `#0F4C81`            |

The `margin` key takes an object with any of `top`, `bottom`, `left`, and `right`, for example `{ "top": "2.5cm", "bottom": "2.5cm", "left": "2cm", "right": "2cm" }`.

For `linkColor`, the Settings Editor shows a colour picker for ease of use. In `overrides.json` or `jupyter-lite.json`, you can use a HEX value such as `#0F4C81` (with or without the `#`). An invalid value fails the PDF export.

#### An example deployment configuration

Each key goes under the plugin ID `jupyterlite-pdf-exporter:plugin`. Here is a full `overrides.json` that you can drop into your JupyterLite build folder:

```json
{
  "jupyterlite-pdf-exporter:plugin": {
    "pageSize": "us-letter",
    "mainFont": "New Computer Modern",
    "pageNumbers": false,
    "tableOfContents": true,
    "numberSections": true,
    "lineSpacing": 1.15,
    "linkColor": "#0F4C81",
    "margin": {
      "top": "3cm",
      "bottom": "3cm",
      "left": "2.5cm",
      "right": "2.5cm"
    }
  }
}
```

The same values can instead live under `settingsOverrides` in your `jupyter-lite.json` as well:

```json
{
  "jupyter-lite-schema-version": 0,
  "jupyter-config-data": {
    "settingsOverrides": {
      "jupyterlite-pdf-exporter:plugin": {
        "pageSize": "us-letter",
        "pageNumbers": false
      }
    }
  }
}
```

For further reference, navigate to the following resources:

1. [JupyterLite documentation on configuration files](https://jupyterlite.readthedocs.io/en/stable/howto/configure/config_files.html)
2. [JupyterLite documentation on settings overrides](https://jupyterlite.readthedocs.io/en/stable/howto/configure/settings.html)

## License

The source code of this JupyterLite extension is licensed under the terms of the BSD-3-Clause "New" or "Revised" License (`BSD-3-Clause`; see the [LICENSE](LICENSE.txt) file for details).

> [!IMPORTANT]
> However, the source distribution and wheel for this JupyterLite extension on PyPI are licensed under the terms of the GNU General Public License version 2.0 (GPL-2.0) or later (`GPL-2.0-or-later`). Please see the [Pandoc license file](LICENSE-PANDOC.txt) for details.

The WebAssembly/JavaScript distribution of Typst, `@myriaddreamin/typst-all-in-one`, is licensed under the terms of the Apache License 2.0 (`Apache-2.0`). Please see the [Typst license file](LICENSE-TYPST.txt) for details.

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
