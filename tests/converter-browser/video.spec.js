import { test, expect } from '@playwright/test';
import { callHarness, getResultByteLength } from './helpers.js';

test.describe('converter video conversions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__converterHarness?.processVideo);
  });

  test('remuxes generated WebM when supported', async ({ page }) => {
    const generatedBase64 = await page.evaluate(async () => {
      const fn = window.__converterHarness?.generateTinyWebm;
      if (!fn) return null;
      const bytes = await fn();
      if (!bytes) return null;
      let encoded = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        encoded += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      return btoa(encoded);
    });

    test.skip(!generatedBase64, 'MediaRecorder WebM generation unavailable in this browser');

    const bytes = Buffer.from(generatedBase64, 'base64');
    const result = await callHarness(page, 'processVideo', bytes, 'webm-remux');

    if (result.skipped) {
      test.skip(true, result.reason);
    }

    expect(result.mimeType).toBe('video/webm');
    expect(getResultByteLength(result)).toBeGreaterThan(0);
  });

  test('skips transcode when VideoEncoder unavailable', async ({ page }) => {
    const hasEncoder = await page.evaluate(() => typeof VideoEncoder !== 'undefined');
    test.skip(hasEncoder, 'VideoEncoder available — transcode path not skipped');

    const stub = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]);
    const result = await callHarness(page, 'processVideo', stub, 'webm-to-mp4');
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('VIDEO_ENCODER_UNAVAILABLE');
  });
});
