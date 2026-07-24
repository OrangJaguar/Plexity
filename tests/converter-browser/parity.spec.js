import { test, expect } from '@playwright/test';

/**
 * This harness intentionally does not mount the full app router — it only
 * loads the converter engine/adapters/queue/worker modules directly so
 * browser-only APIs (OffscreenCanvas, VideoEncoder, real Worker, etc.) can be
 * exercised without pulling in auth, routing, or unrelated tool bundles.
 *
 * Route/component parity between the public (`/convert`) and admin
 * (`/admin/convert`) surfaces — i.e. that both render the same
 * `ConverterContent` with identical capabilities — is covered by the vitest
 * suite in src/lib/tools/converter/converter-v1-parity.test.js. This spec
 * only adds a browser-level check that the (heavy, ~30MB) FFmpeg core is
 * never fetched just from loading the converter UI/engine — only once an
 * FFmpeg-only operation actually runs. See ffmpeg-lazy.spec.js for the
 * "does load once triggered" half of that contract.
 */
test.describe('converter harness parity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__converterHarness?.processImage);
  });

  test('harness exposes the same adapters/queue/worker-client modules the app uses', async ({ page }) => {
    await expect(page.locator('#app')).toHaveText('Converter harness ready');

    const hasCoreApi = await page.evaluate(() => {
      const harness = window.__converterHarness;
      return [
        'processImage',
        'processWav',
        'processData',
        'processVideo',
        'processViaWorker',
        'getWorkerModuleUrl',
        'listPresetIds',
      ].every((key) => typeof harness[key] === 'function' || key in harness);
    });
    expect(hasCoreApi).toBe(true);

    const presetIds = await page.evaluate(() => window.__converterHarness.listPresetIds());
    expect(presetIds).toContain('make-smaller');
    expect(presetIds.length).toBeGreaterThanOrEqual(7);
  });

  test('does not fetch the FFmpeg core just from loading the converter engine', async ({ page }) => {
    // Give any eager/background fetches a moment to fire before asserting none did.
    await page.waitForTimeout(250);

    const ffmpegRequestCount = await page.evaluate(
      () => performance.getEntriesByType('resource').filter((entry) => entry.name.includes('ffmpeg-core')).length,
    );
    expect(ffmpegRequestCount).toBe(0);
  });
});
