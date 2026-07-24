import { test, expect } from '@playwright/test';

test.describe('converter worker assets', () => {
  test('worker module loads with module type', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__converterHarness?.getWorkerModuleUrl);

    const workerInfo = await page.evaluate(async () => {
      const url = window.__converterHarness.getWorkerModuleUrl();
      const response = await fetch(url);
      const text = await response.text();
      return {
        ok: response.ok,
        url,
        bodyStartsWith: text.slice(0, 40),
      };
    });

    expect(workerInfo.ok).toBe(true);
    expect(workerInfo.bodyStartsWith).toContain('import');
    expect(workerInfo.url).toContain('converter.worker.js');
  });
});
