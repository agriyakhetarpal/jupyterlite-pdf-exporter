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

test('should disable the prompt gutter for themes without prompts', async ({
  page,
  request
}) => {
  await page.goto();
  await page.evaluate(async () => {
    await window.jupyterapp.commands.execute('settingeditor:open', {
      query: 'JupyterLite PDF Exporter'
    });
  });

  const form = page.locator('.jp-SettingsForm').first();
  const theme = form.locator('select[id$="_theme"]');
  const promptGutter = form.locator('select[id$="_promptGutter"]');

  await expect(theme).toHaveValue(/./);
  await expect(promptGutter).toBeEnabled();

  await theme.selectOption({ label: 'Neat' });
  await expect(promptGutter).toBeDisabled();

  await theme.selectOption({ label: 'Plain' });
  await expect(promptGutter).toBeDisabled();

  await theme.selectOption({ label: 'Notebook' });
  await expect(promptGutter).toBeEnabled();

  // The form saves as it changes, so put the settings back for other tests
  await request.put('/lab/api/settings/jupyterlite-pdf-exporter:plugin', {
    data: { raw: '{}' }
  });
});
