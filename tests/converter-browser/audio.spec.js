import { test, expect } from '@playwright/test';
import { callHarness, getResultByteLength, readFixture } from './helpers.js';

test.describe('converter wav transform', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__converterHarness?.processWav);
  });

  test('transforms WAV and returns wav mime type', async ({ page }) => {
    const wav = readFixture('tiny.wav');
    const result = await callHarness(page, 'processWav', wav, 'wav-transform', {
      sampleRate: 22050,
      channels: 1,
    });

    expect(result.mimeType).toBe('audio/wav');
    expect(result.fileName).toMatch(/\.wav$/i);
    expect(getResultByteLength(result)).toBeGreaterThan(44);
  });
});
