import { test, expect } from '@playwright/test';

/**
 * @param {string} text
 */
function toBase64(text) {
  return Buffer.from(text, 'utf8').toString('base64');
}

test.describe('converter package (ZIP) building', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__converterHarness?.packageFiles);
  });

  test('builds a downloadable ZIP from multiple outputs', async ({ page }) => {
    const entries = [
      { name: 'first.txt', base64: toBase64('hello') },
      { name: 'second.txt', base64: toBase64('world') },
    ];

    const result = await page.evaluate(
      ({ files }) => window.__converterHarness.packageFiles(files, 'outputs.zip'),
      { files: entries },
    );

    expect(result.fileName).toBe('outputs.zip');
    expect(result.size).toBeGreaterThan(0);

    const zipBytes = Buffer.from(result.bufferBase64, 'base64');
    // Local file header signature "PK\x03\x04" — a cheap sanity check that
    // the harness produced a real ZIP rather than raw/garbage bytes.
    expect(zipBytes[0]).toBe(0x50);
    expect(zipBytes[1]).toBe(0x4b);
  });

  test('renames colliding sanitized file names instead of dropping entries', async ({ page }) => {
    const entries = [
      { name: 'photo<1>.png', base64: toBase64('first') },
      { name: 'photo?1?.png', base64: toBase64('second') },
    ];

    const result = await page.evaluate(
      ({ files }) => window.__converterHarness.packageFiles(files, 'collisions.zip'),
      { files: entries },
    );

    expect(result.fileName).toBe('collisions.zip');
    expect(result.size).toBeGreaterThan(0);
  });

  test('rejects packages over the file-count limit with an actionable code', async ({ page }) => {
    const entries = Array.from({ length: 41 }, (_, i) => ({ name: `f${i}.txt`, base64: toBase64('x') }));

    const result = await page.evaluate(async ({ files }) => {
      try {
        await window.__converterHarness.packageFiles(files, 'too-many.zip');
        return { rejected: false };
      } catch (error) {
        return { rejected: true, code: error?.code };
      }
    }, { files: entries });

    expect(result.rejected).toBe(true);
    expect(result.code).toBe('TOO_MANY_FILES');
  });
});
