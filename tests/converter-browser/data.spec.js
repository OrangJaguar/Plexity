import { test, expect } from '@playwright/test';
import { callHarness, decodeResultText, readFixture } from './helpers.js';

test.describe('converter data conversions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__converterHarness?.processData);
  });

  test('converts CSV to JSON', async ({ page }) => {
    const csv = readFixture('sample.csv');
    const result = await callHarness(page, 'processData', csv, 'csv-to-json', { pretty: true });

    expect(result.mimeType).toBe('application/json');
    expect(result.fileName).toMatch(/\.json$/i);

    const jsonText = decodeResultText(result);
    const json = JSON.parse(jsonText);
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
  });
});
