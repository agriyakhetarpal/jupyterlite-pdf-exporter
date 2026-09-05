# `jupyterlite-pdf-exporter`

> [!TIP]
> While this extension was originally designed for JupyterLite in mind and was thus named `jupyterlite-pdf-exporter`, it is agnostic to the Jupyter environment. It works in JupyterLite, JupyterLab 4.x, Jupyter Notebook 7, and JupyterHub deployments, all from a single installation. You do not need a LaTeX distribution set up or a server to export your notebooks to PDF.

| Classifiers    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Builds         | [![Github Actions build status](https://github.com/agriyakhetarpal/jupyterlite-pdf-exporter/workflows/Build/badge.svg)](https://github.com/agriyakhetarpal/jupyterlite-pdf-exporter/actions/workflows/build.yml) ![PyPI version](https://img.shields.io/pypi/v/jupyterlite-pdf-exporter?color=green)                                                                                                                                                                                                                                                                                                                                                                                     |
| Try it out!    | [![Try PDF exporter in JupyterLite](https://jupyterlite.rtfd.io/en/latest/_static/badge.svg)](https://agriyakhetarp.al/jupyterlite-pdf-exporter/lab/index.html?path=README.md&path=matplotlib.ipynb) [![Try PDF exporter in JupyterLab on Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/agriyakhetarpal/jupyterlite-pdf-exporter/HEAD?urlpath=lab)                                                                                                                                                                                                                                                                                                            |
| PyPI downloads | [![PyPI Downloads](https://static.pepy.tech/personalized-badge/jupyterlite-pdf-exporter?period=total&units=NONE&left_color=GREY&right_color=ORANGE&left_text=all%20time)](https://pepy.tech/projects/jupyterlite-pdf-exporter) [![PyPI Downloads](https://static.pepy.tech/personalized-badge/jupyterlite-pdf-exporter?period=weekly&units=NONE&left_color=GREY&right_color=ORANGE&left_text=weekly)](https://pepy.tech/projects/jupyterlite-pdf-exporter) [![PyPI Downloads](https://static.pepy.tech/personalized-badge/jupyterlite-pdf-exporter?period=monthly&units=NONE&left_color=GREY&right_color=ORANGE&left_text=monthly)](https://pepy.tech/projects/jupyterlite-pdf-exporter) |
| conda package  | [![Conda Version](https://img.shields.io/conda/vn/conda-forge/jupyterlite-pdf-exporter.svg)](https://anaconda.org/conda-forge/jupyterlite-pdf-exporter) [![Recipe](https://img.shields.io/badge/recipe-jupyterlite--pdf--exporter-green.svg)](https://anaconda.org/conda-forge/jupyterlite-pdf-exporter) [![Conda Downloads](https://img.shields.io/conda/dn/conda-forge/jupyterlite-pdf-exporter.svg)](https://anaconda.org/conda-forge/jupyterlite-pdf-exporter)                                                                                                                                                                                                                       |

A serverless PDF exporter for JupyterLite, JupyterLab, and Jupyter Notebook, based on a WebAssembly distribution of [Typst](https://typst.org/) and the [Callisto](https://typst.app/universe/package/callisto) Typst package.

- This Jupyter extension registers a PDF exporter with [JupyterLite's `INbConvertExporters` interface](https://jupyterlite.readthedocs.io/en/stable/howto/extensions/custom-exporters.html).
- In JupyterLab and Jupyter Notebook, it adds an "Export Notebook to PDF" command to the File menu and the command palette.

It runs fully in the browser in a serverless fashion, so it works the same way across all three. It does not require a LaTeX distribution or a server, and it works in environments where you cannot install software, such as on a Chromebook or in a locked-down corporate environment. The PDF is downloaded to your machine at a location of your choice.

## Why?

The usual way to convert a notebook into a PDF is `nbconvert` driving a LaTeX distribution such as TeX Live or MiKTeX, or a headless browser via Playwright (WebPDF). These typically run on a server, and often need administrator rights to install. On a Chromebook, a managed corporate laptop, or any machine where you cannot install software easily, setting them up is frequently not an option. In JupyterLite, there is no server at all, so that route does not exist and notebooks could not be exported to PDF this way.

This extension provides a different mechanism to export notebooks to PDF that runs entirely in your browser:

1. [Callisto](https://typst.app/universe/package/callisto), a Typst package, reads the notebook and turns each cell into Typst content. Markdown cells are converted via [cmarker](https://github.com/SabrinaJewson/cmarker.typ), LaTeX math is converted via [MiTeX](https://github.com/mitex-rs/mitex). Rich outputs such as images, tables, and formatted text are also supported.
2. The [Typst](https://typst.org/) compiler, a modern typesetting system that stands in for LaTeX and is compiled to WebAssembly, renders that content into a PDF.

## Installation

To install the extension into your Jupyter deployment, execute:

```bash
pip install jupyterlite-pdf-exporter
```

- For JupyterLite, rebuild your JupyterLite distribution after installing, so the extension is bundled into your site.
- For JupyterLab or Jupyter Notebook, that is all you need. Start (or restart) the app and you should see "PDF (via jupyterlite-pdf-exporter)" in the "Save and Export Notebook As" section under the "File" menu.

## Uninstalling the extension

To remove the extension from your JupyterLite deployment, execute:

```bash
pip uninstall jupyterlite-pdf-exporter
```

and rebuild your JupyterLite distribution.

## Usage

In both JupyterLab and JupyterLite environments, the entry point to usage lives in the same place, under "File" > "Save and Export Notebook As". The exported PDF is downloaded to your machine at a location of your choice.

### Requirements

- Either:
  - JupyterLite >=0.7.0,<0.9, or
  - JupyterLab >= 4.5.0
  - Jupyter Notebook >=7.5

    This extension does not depend on or enforce a particular version of JupyterLite or JupyterLab, but please note that cutting-edge versions of JupyterLite, JupyterLab, and Jupyter Notebook may introduce breaking changes. If you face any troubles, please [file an issue](https://github.com/agriyakhetarpal/jupyterlite-pdf-exporter/issues/new/choose)!

- A modern web browser with support for WebAssembly and Web Workers (e.g., Chrome, Firefox, Safari, Edge, and so on). All browsers supported by JupyterLite should work with this extension.
- The extension relies on a WebAssembly distrbution of the Typst compiler. It is quite large (about 29 MiB on disk, or about 10 MiB when sent compressed over the network) and may take some time to download and initialise when the extension is first used. The compiler runs in a Web Worker, so the interface stays responsive while a PDF is being generated. The distribution also bundles the Typst packages it needs to function. For a better user experience, it is recommended to use this extension in an environment with a stable and reasonably fast internet connection.

### JupyterLite

- Install this extension in your JupyterLite deployment via `pip install jupyterlite-pdf-exporter` and rebuild your JupyterLite distribution.
- Open a notebook in JupyterLite, click on the "File" menu, and select "Save and Export Notebook As" > "PDF".
  - You may also run "Save and Export Notebook: PDF" via the command palette.

### In JupyterLab or Jupyter Notebook

- Install this extension in your environment and open JupyterLab/Jupyter Notebook.
- Open a notebook, then pick "File" > "Save and Export Notebook As" > "PDF (via jupyterlite-pdf-exporter)".
  - You may also run "Save and Export Notebook: PDF (via jupyterlite-pdf-exporter)" via the command palette.

### Customising the PDFs

It is also possible to change the look and feel of the exported PDF(s) through the settings.

To change the settings for yourself, open the "Settings Editor" from the "Settings" menu in JupyterLite, JupyterLab, or Notebook 7, and pick "JupyterLite PDF Exporter". The form lets you set the page size, font, margins, and more. The new settings apply the next time you export a notebook. Choosing the settings per-notebook is currently not implemented.

- If you build a JupyterLite site for other people, you can set the defaults for everyone. For JupyterLite, you may add an entry for `jupyterlite-pdf-exporter:plugin` to an `overrides.json` file in your build, or to the `settingsOverrides` field in your `jupyter-lite.json` file.
- On JupyterLab and Jupyter Notebook, add the same `jupyterlite-pdf-exporter:plugin` entry to an `overrides.json` in your app settings directory. Those values become the starting point for every user, who can still change them in their own Settings Editor.

Only the fonts that come bundled with the Typst compiler are available.

Here is a table of what each setting changes. The "Key" column is the name you write in `overrides.json` or in `settingsOverrides`. The "Typst rule" column shows the rule the setting turns into, in [typst/wrapper.typ](typst/wrapper.typ). This is handy if you would like to read the [Typst](https://typst.app/docs/) and [Callisto](https://github.com/sijow/callisto) documentation, but you do not need to know everything to use the settings.

| Setting           | Key               | What it does                                                                                          | Typst rule                       | Example value(s)                      |
| ----------------- | ----------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------- |
| Page size         | `pageSize`        | Sets the paper size of the PDF                                                                        | `page(paper:)`                   | `a4`, `us-letter`                     |
| Font size         | `fontSize`        | Sets the base text size                                                                               | `text(size:)`                    | `10pt`, `12pt`                        |
| Margins           | `margin`          | Sets the space around the page edges                                                                  | `page(margin:)`                  | `{ "top": "2.5cm" }`                  |
| Main font         | `mainFont`        | Picks the body font from the bundled fonts                                                            | `text(font:)`                    | `Libertinus Serif`                    |
| Page numbers      | `pageNumbers`     | Turns page numbers on or off                                                                          | `page(numbering:)`               | `true` (default)                      |
| Table of contents | `tableOfContents` | Adds a contents list at the start                                                                     | `outline()`                      | `false` (default)                     |
| Number sections   | `numberSections`  | Adds numbers to headings                                                                              | `heading(numbering:)`            | `false` (default)                     |
| Line spacing      | `lineSpacing`     | Sets the spacing between lines                                                                        | `par(leading:)`                  | `1` (default), `1.5`                  |
| Link color        | `linkColor`       | Sets the colour used for links                                                                        | `show link`                      | `#0F4C81`                             |
| Theme             | `theme`           | Picks how cells are laid out, from Callisto's built-in themes                                         | `callisto.render(theme:)`        | `notebook` (default), `neat`, `plain` |
| Prompt gutter     | `promptGutter`    | Which cells are indented to make room for the `In [n]:` and `Out[n]:` prompts of the `notebook` theme | `pad(left:)`                     | `code` (default), `all`               |
| Hide code inputs  | `hideInputs`      | Leaves the source (inputs) of code cells out and keeps their outputs                                  | `callisto.render(input:)`        | `false` (default)                     |
| Hide code outputs | `hideOutputs`     | Leaves the outputs of code cells out and keeps their source                                           | `callisto.render(output:)`       | `false` (default)                     |
| ANSI colours      | `ansiColors`      | Renders the colours that ANSI escape codes in text outputs request, or strips the codes               | `callisto.render(console-text:)` | `true` (default)                      |

The `margin` key takes an object with any of `top`, `bottom`, `left`, and `right`, for example `{ "top": "2.5cm", "bottom": "2.5cm", "left": "2cm", "right": "2cm" }`.

The `theme` key picks one of the themes that come with Callisto:

- The `notebook` theme is the default and it closely resembles the Jupyter interface, with `In [n]:` and `Out[n]:` prompts next to each cell.
- The `neat` theme keeps the cell styling but drops the prompts, which reads more like a document.
- The `plain` theme does not apply any styling to the cells.

Callisto draws the `In[n]:` and `Out[n]:` prompts in the left page margin, which means that they get cut off when the margin is narrower than the prompt; for example, with a large font or a multiple-digit execution count or anything else that forces the prompts to overflow (see [sijow/callisto#22](https://github.com/sijow/callisto/issues/22) for details). To avoid that, the exporter indents cells by the width of the widest prompt in the notebook. By default, only code cells are indented, not Markdown or raw cells. You may set `promptGutter` to `all` to also indent Markdown and raw cells by the same amount, so that every cell in your notebook shares one left edge.

For `linkColor`, the Settings Editor shows a colour picker for ease of use. In `overrides.json` or `jupyter-lite.json`, you can use a HEX value such as `#0F4C81` (with or without the `#`). An invalid value fails the PDF export.

#### Leaving cells out via tags

Besides the `hideInputs` and `hideOutputs` settings, which apply to every code cell, you may also leave out individual cells, or their inputs or outputs, with cell tags. This is based on the conventions associated with [Jupyter Book (v1)](https://jupyterbook.org/en/stable/interactive/hiding.html) and the [nbconvert](https://nbconvert.readthedocs.io/en/latest/removing_cells.html) projects. You may add a tag to a cell from the property inspector available in the right sidebar.

| Tag                                | Effect                                        |
| ---------------------------------- | --------------------------------------------- |
| `remove-cell` or `remove_cell`     | Leaves out the whole cell, of any type        |
| `remove-input` or `remove_input`   | Leaves out the source (inputs) of a code cell |
| `remove-output` or `remove_output` | Leaves out the outputs of a code cell         |

When the `hideInputs` setting is off and the cell has no `remove-input` tag, the source appears, and likewise for outputs. In that sense, the tags can only hide more than the settings do, not less.

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
    "theme": "neat",
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

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full setup. To try your local changes in JupyterLab or Jupyter Notebook, build the extension and link it into your environment:

```bash
jlpm install
jlpm build
jupyter-builder develop --overwrite .
```

Then start JupyterLab with `jupyter lab` or Jupyter Notebook with `jupyter notebook`. After a code change, run `jlpm build` again and refresh the browser.

To try your local changes in JupyterLite, build the extension and link it into your JupyterLite build:

```bash
jlpm install
jlpm build
jupyter-builder develop --overwrite .
```

Then rebuild your JupyterLite distribution and open it in the browser via `jupyter lite build` and `jupyter lite serve` (or your usual JupyterLite build and serve commands). After a code change, run `jlpm build` again, rebuild your JupyterLite distribution, and refresh the browser.

## License

The source code and binaries are licensed under the terms of the BSD-3-Clause "New" or "Revised" License. Please see the [LICENSE](LICENSE.txt) file for details.

Here is a table of the licenses of the dependencies bundled by this extension. The Typst packages are Callisto and its dependencies, which are fetched from the [Typst package registry](https://typst.app/universe/).

| Component                                                                                                                                                                                                                                                               | License      | File                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------- |
| [`@myriaddreamin/typst.ts`](https://www.npmjs.com/package/@myriaddreamin/typst.ts) and [`@myriaddreamin/typst-ts-web-compiler`](https://www.npmjs.com/package/@myriaddreamin/typst-ts-web-compiler), the WebAssembly build of the Typst compiler and its JavaScript API | `Apache-2.0` | [LICENSE-TYPST.txt](LICENSE-TYPST.txt)                          |
| [Callisto](https://github.com/sijow/callisto)                                                                                                                                                                                                                           | `MIT`        | [LICENSE-callisto.txt](typst-packages/LICENSE-callisto.txt)     |
| [cmarker](https://github.com/SabrinaJewson/cmarker.typ)                                                                                                                                                                                                                 | `MIT`        | [LICENSE-cmarker.txt](typst-packages/LICENSE-cmarker.txt)       |
| [MiTeX](https://github.com/mitex-rs/mitex)                                                                                                                                                                                                                              | `Apache-2.0` | [LICENSE-mitex.txt](typst-packages/LICENSE-mitex.txt)           |
| [based](https://github.com/EpicEricEE/typst-based)                                                                                                                                                                                                                      | `MIT`        | [LICENSE-based.txt](typst-packages/LICENSE-based.txt)           |
| [percencode](https://github.com/Servostar/typst-percencode)                                                                                                                                                                                                             | `MIT`        | [LICENSE-percencode.txt](typst-packages/LICENSE-percencode.txt) |

For an overview of the licenses of all the JavaScript dependencies of this extension at runtime, please navigate to your Jupyter deployment > "Help" menu > "Licenses".

## Thanks 💛

This project would not have been possible without the following open source projects:

- [JupyterLite](https://jupyterlite.rtfd.io/en/latest/): A JupyterLab distribution that runs entirely in the web browser, powered by WebAssembly and Web Workers.
- [JupyterLab](https://jupyterlab.readthedocs.io/en/stable/): The next-generation web-based user interface for Project Jupyter, with a rich ecosystem of extensions.
- [Jupyter Notebook](https://jupyter-notebook.readthedocs.io/): The original web-based interactive computing environment for Jupyter, which continues to be widely used and developed in its own right.
- [Callisto](https://github.com/sijow/callisto): A Typst package that reads Jupyter notebooks and renders their cells, on which this extension is built.
- [Typst](https://typst.app/): A modern typesetting system that provides high-quality PDF output and a user-friendly syntax for document design.
- [cmarker](https://github.com/SabrinaJewson/cmarker.typ) and [MiTeX](https://github.com/mitex-rs/mitex): Typst packages that Callisto uses to convert Markdown and LaTeX math.
- [typst.ts](https://github.com/Myriad-Dreamin/typst.ts): A WebAssembly build of Typst with a JavaScript API, which allows it to run in web browsers and other JavaScript environments.

I made use of the following open source projects in earlier versions of this extension. They are no longer used in the current version, but this extension would not have been possible without them!

- [Pandoc](https://pandoc.org/): A universal document converter that supports a wide variety of input and output formats, including Jupyter notebooks and PDF.
- [pandoc-wasm](https://www.npmjs.com/package/pandoc-wasm): A WebAssembly distribution of Pandoc that allows it to run in web browsers and other JavaScript environments.
