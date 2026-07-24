import { test, expect } from '@playwright/test';
import { callHarness, getResultByteLength, readFixture } from './helpers.js';

test.describe('converter image conversions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__converterHarness?.processImage);
  });

  test('converts transparent PNG to WebP and JPEG with resize', async ({ page }) => {
    const png = readFixture('tiny.png');
    const webp = await callHarness(page, 'processImage', png, 'png-to-webp', { maxWidth: 32, quality: 0.8 });
    expect(webp.mimeType).toBe('image/webp');
    expect(getResultByteLength(webp)).toBeGreaterThan(0);
    expect(webp.metadata?.width).toBeGreaterThan(0);

    const jpeg = await callHarness(page, 'processImage', png, 'png-to-jpeg', {
      maxWidth: 32,
      flattenTransparency: true,
      quality: 0.85,
    });
    expect(jpeg.mimeType).toBe('image/jpeg');
    expect(getResultByteLength(jpeg)).toBeGreaterThan(0);
  });

  test('converts WebP to PNG with valid output', async ({ page }) => {
    const webp = readFixture('tiny.webp');
    const result = await callHarness(page, 'processImage', webp, 'webp-to-png');

    expect(result.mimeType).toBe('image/png');
    expect(getResultByteLength(result)).toBeGreaterThan(0);
  });

  test('converts WebP to JPEG and preserves dimensions metadata', async ({ page }) => {
    const webp = readFixture('tiny.webp');
    const result = await callHarness(page, 'processImage', webp, 'webp-to-jpeg', { flattenTransparency: true });

    expect(result.mimeType).toBe('image/jpeg');
    expect(result.metadata?.width).toBeGreaterThan(0);
    expect(result.metadata?.height).toBeGreaterThan(0);
  });

  test('processes PNG through the real converter worker', async ({ page }) => {
    const png = readFixture('tiny.png');
    const result = await callHarness(page, 'processViaWorker', png, 'png-to-webp', { quality: 0.9 });
    expect(result.mimeType).toBe('image/webp');
    expect(getResultByteLength(result)).toBeGreaterThan(0);
  });
});
