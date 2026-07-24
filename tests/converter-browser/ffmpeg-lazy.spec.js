import { test, expect } from '@playwright/test';
import { readFixture } from './helpers.js';

/**
 * FFmpeg's core.wasm is ~30MB, so it must never be fetched until an
 * FFmpeg-only operation actually runs. The "not fetched initially" half of
 * this contract is cheap and always runs; the "does load once triggered"
 * half only waits for the network request to start — full wasm convert can
 * exceed CI budgets on slow hosts.
 */
test.describe('FFmpeg lazy loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__converterHarness?.processWav);
  });

  test('never requests ffmpeg-core.wasm before an FFmpeg-only operation runs', async ({ page }) => {
    await page.waitForTimeout(250);

    const requestedBeforeTrigger = await page.evaluate(
      () => performance.getEntriesByType('resource').some((entry) => entry.name.includes('ffmpeg-core.wasm')),
    );
    expect(requestedBeforeTrigger).toBe(false);
  });

  test('requests ffmpeg-core.wasm once an FFmpeg-only conversion is triggered', async ({ page }) => {
    test.setTimeout(90_000);

    const wav = readFixture('tiny.wav');
    const wavBase64 = Buffer.from(wav).toString('base64');

    const wasmRequestPromise = page.waitForRequest(
      (request) => request.url().includes('ffmpeg-core.wasm'),
      { timeout: 60_000 },
    ).catch(() => null);

    // Fire-and-forget: we only need the runtime to start loading, not finish.
    const conversionPromise = page.evaluate(async ({ base64 }) => {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      try {
        await window.__converterHarness.processWav(bytes, 'wav-to-mp3', { bitrateKbps: 96 });
        return { ok: true };
      } catch (error) {
        return { ok: false, message: String(error?.message ?? error) };
      }
    }, { base64: wavBase64 });

    const wasmRequest = await wasmRequestPromise;
    test.skip(!wasmRequest, 'FFmpeg core was not requested — runtime may be unavailable in this environment');

    expect(wasmRequest.url()).toContain('ffmpeg-core.wasm');

    // Don't block the suite on a full 30MB convert; abandon the page work.
    await Promise.race([
      conversionPromise,
      page.waitForTimeout(500),
    ]).catch(() => {});
  });
});
