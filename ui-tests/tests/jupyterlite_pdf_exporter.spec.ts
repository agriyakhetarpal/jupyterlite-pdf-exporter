import { expect, test } from '@jupyterlab/galata';

/**
 * Don't load JupyterLab webpage before running the tests.
 * This is required to ensure we capture all log messages.
 */
test.use({ autoGoto: false });

test('should register the PDF export command', async ({ page }) => {
  await page.goto();
  const hasCommand = await page.evaluate(async () => {
    const app = window.jupyterapp;
    return app.commands.hasCommand('jupyterlite-pdf-exporter:export-pdf');
  });

  expect(hasCommand).toBe(true);
});

test('should list the PDF exporter in the command palette', async ({
  page
}) => {
  await page.goto();

  const label = await page.evaluate(async () => {
    const app = window.jupyterapp;
    return app.commands.label('jupyterlite-pdf-exporter:export-pdf', {});
  });

  expect(label).toContain('PDF');
});
