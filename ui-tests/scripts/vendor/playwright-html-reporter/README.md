# Vendored Playwright HTML reporter styles

These stylesheets are copied verbatim from Microsoft's Playwright, so that our
PDF export report looks like the report we get from `jlpm playwright show-report`.
They are Apache-2.0 licensed. See `LICENSE` in this folder for more information.

| Source                                       | Provides                                     |
| -------------------------------------------- | -------------------------------------------- |
| `packages/html-reporter/src/colors.css`      | GitHub Primer colour tokens, light and dark  |
| `packages/html-reporter/src/common.css`      | Layout helpers, nav items, counters, inputs  |
| `packages/html-reporter/src/chip.css`        | Collapsible section headers and bodies       |
| `packages/html-reporter/src/headerView.css`  | Header and the status nav container          |
| `packages/html-reporter/src/testFileView.css`| Test row typography and detail rows          |
| `packages/html-reporter/src/reportView.css`  | Page-level layout, 1024px column             |
| `packages/html-reporter/src/theme.css`       | Root font stack                              |

These were last vendored from `playwright/test` `v1.62.1`.

## Re-vendoring

When the pinned Playwright version changes, refresh these files and update the
tag above:

```console
$ TAG=v1.62.1  # match ui-tests/package.json
$ for f in colors.css common.css chip.css headerView.css \
           testFileView.css reportView.css theme.css; do
    gh api "repos/microsoft/playwright/contents/packages/html-reporter/src/$f?ref=$TAG" \
      -H "Accept: application/vnd.github.raw" > "$f"
  done
$ gh api "repos/microsoft/playwright/contents/LICENSE?ref=$TAG" \
    -H "Accept: application/vnd.github.raw" > LICENSE
```

Then rebuild the report:

```console
$ cd ../.. && jlpm report && open report.html
```
