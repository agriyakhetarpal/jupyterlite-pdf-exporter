# Integration Testing

This folder contains the integration tests of the extension.

They are defined using [Playwright](https://playwright.dev/docs/intro) test runner
and [Galata](https://github.com/jupyterlab/jupyterlab/tree/main/galata) helper.

The Playwright configuration is defined in [playwright.config.js](./playwright.config.js).

The JupyterLab server configuration to use for the integration test is defined
in [jupyter_server_test_config.py](./jupyter_server_test_config.py).

The default configuration will produce video for failing tests and an HTML report.

> There is a UI mode that you may like; see [that video](https://www.youtube.com/watch?v=jF0yA-JLQW0).

## Run the tests

> All commands are assumed to be executed from the root directory

To run the tests, you need to:

1. Compile the extension:

```sh
jlpm install
jlpm build:prod
```

> Check the extension is installed in JupyterLab.

2. Install test dependencies (needed only once):

```sh
cd ./ui-tests
jlpm install
jlpm playwright install
cd ..
```

3. Execute the [Playwright](https://playwright.dev/docs/intro) tests:

```sh
cd ./ui-tests
jlpm playwright test
```

Test results will be shown in the terminal. In case of any test failures, the test report
will be opened in your browser at the end of the tests execution; see
[Playwright documentation](https://playwright.dev/docs/test-reporters#html-reporter)
for configuring that behavior.

## Test report

The export tests write the PDFs they produce into `pdf-output/`, along with a
render of the first page and the text extracted from it. We use [scripts/build_report.py](./scripts/build_report.py)
to turn that folder into a single self-contained `report.html`.

```sh
# 1. Install the extension in development mode, from the root directory
python -m venv .venv
source .venv/bin/activate
pip install --editable "." --group dev
jupyter-builder develop . --overwrite
jlpm install && jlpm build

# 2. Install the test dependencies and a browser (needed only once)
cd ui-tests
jlpm install
jlpm playwright install

# 3. Run the tests, which writes pdf-output/ and test-results/results.json
jlpm test

# 4. Assemble the report and open it
jlpm report
open report.html  # or xdg-open on Linux
```

In CI, we upload the report as an artifact, and [test-report-redirect.yml](../.github/workflows/test-report-redirect.yml)
adds a commit status linking to it, for convenience.

## Snapshots

Every export is also compared against reference snapshots committed under
`tests/<spec>-snapshots/`: the text extracted from the PDF (`<slug>.txt`) and a
render of each page (`<slug>-page-<n>.png`). We do this to catch content and layout regressions, i.e., both text and visual.

These assertions are present in [helpers/export.ts](./helpers/export.ts). The
pages are rasterised with [PDFium](https://pdfium.googlesource.com/pdfium/) compiled to WebAssembly.

To add or update snapshots, run the tests with the update flag and commit the
new files under `tests/<spec>-snapshots/`:

```sh
jlpm test:update
```

You may also comment on the pull request:

```markdown
bot please update snapshots
```

[update-integration-tests.yml](../.github/workflows/update-integration-tests.yml)
then builds the extension, runs `jlpm test:update` and pushes a commit with the new files to the PR branch.

### Before and after

When a snapshot mismatches, you have three places to compare:

1. The Playwright report (the `jupyterlite-pdf-exporter-playwright-tests`
   artifact) shows the expected and actual renders with a slider, plus the diff.
2. The PDF export report (`report.html`) shows the expected, actual, and diff,
   side-by-side on the failing card. You may click any of them to open a lightbox
   with a slider and an onion skin between the expected and actual views.
3. After the bot updates the snapshots, GitHub's "Files changed" view shows the
   old and new PNGs with its two-up, swipe, and onion-skin comparisons.

If a bump of `@hyzyla/pdfium` shifts a few pixels, that may be enough to make
the diff fail and is expected. In such cases, update the snapshots and review
the diff.

## Create tests

> All commands are assumed to be executed from the root directory

To create tests, the easiest way is to use the code generator tool of playwright:

1. Compile the extension:

```sh
jlpm install
jlpm build:prod
```

> Check the extension is installed in JupyterLab.

2. Install test dependencies (needed only once):

```sh
cd ./ui-tests
jlpm install
jlpm playwright install
cd ..
```

3. Start the server:

```sh
cd ./ui-tests
jlpm start
```

4. Execute the [Playwright code generator](https://playwright.dev/docs/codegen) in **another terminal**:

```sh
cd ./ui-tests
jlpm playwright codegen localhost:8888
```

## Debug tests

> All commands are assumed to be executed from the root directory

To debug tests, a good way is to use the inspector tool of playwright:

1. Compile the extension:

```sh
jlpm install
jlpm build:prod
```

> Check the extension is installed in JupyterLab.

2. Install test dependencies (needed only once):

```sh
cd ./ui-tests
jlpm install
jlpm playwright install
cd ..
```

3. Execute the Playwright tests in [debug mode](https://playwright.dev/docs/debug):

```sh
cd ./ui-tests
jlpm playwright test --debug
```

## Upgrade Playwright and the browsers

To update the web browser versions, you must update the package `@playwright/test`:

```sh
cd ./ui-tests
jlpm up "@playwright/test"
jlpm playwright install
```

Afterwards, refresh the stylesheets vendored for the PDF export report so that
it keeps matching `jlpm playwright show-report`. See
[scripts/vendor/playwright-html-reporter/README.md](./scripts/vendor/playwright-html-reporter/README.md).
