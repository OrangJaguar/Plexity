import { test, expect } from '@playwright/test';

test.describe('converter lifecycle smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__converterHarness?.runLifecycleSmoke);
  });

  test('cancel/retry cleanup disposes registry resources', async ({ page }) => {
    const result = await page.evaluate(async () => window.__converterHarness.runLifecycleSmoke());
    expect(result.registryEmpty).toBe(true);
  });
});
