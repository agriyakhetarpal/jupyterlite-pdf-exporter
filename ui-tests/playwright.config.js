/**
 * Configuration for Playwright using default from @jupyterlab/galata
 */
const baseConfig = require('@jupyterlab/galata/lib/playwright-config');

module.exports = {
  ...baseConfig,
  webServer: {
    command: 'jlpm start',
    url: 'http://localhost:8888/lab',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI
  },
  use: {
    ...baseConfig.use,
    acceptDownloads: true
  },
  // Loading the Pandoc and Typst WebAssembly bundles is slow, so
  // we increase the timeout to 4 minutes.
  timeout: 240 * 1000,
  reporter: [
    [process.env.CI ? 'github' : 'list'],
    ['html', { open: 'never' }],
    // build_report.py reads the JSON report to generate a
    // summary of the test results in the HTML report.
    ['json', { outputFile: 'test-results/results.json' }]
  ]
};
