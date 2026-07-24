import { test, expect } from '@playwright/test';

test.describe('converter folder/clipboard import surface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__converterHarness?.getImportCapabilities);
  });

  test('reports folder/clipboard import capability flags for this browser', async ({ page }) => {
    const caps = await page.evaluate(() => window.__converterHarness.getImportCapabilities());

    expect(typeof caps.clipboardReadSupported).toBe('boolean');
    expect(typeof caps.clipboardWriteTextSupported).toBe('boolean');
    expect(typeof caps.directoryEntrySupported).toBe('boolean');
    expect(typeof caps.directoryPickerSupported).toBe('boolean');

    // Chromium supports drag-drop directory entries (webkitGetAsEntry) and the
    // async Clipboard API; this pins that expectation so a regression in how
    // the app detects these fallbacks doesn't go unnoticed.
    expect(caps.directoryEntrySupported).toBe(true);
    expect(caps.clipboardReadSupported).toBe(true);
  });

  test('imports pasted text as a file via the clipboard fallback path', async ({ page }) => {
    const result = await page.evaluate(() =>
      window.__converterHarness.importClipboardText('name,value\nalpha,1\n', 'clip.csv'),
    );

    expect(result.acceptedNames).toEqual(['clip.csv']);
    expect(result.rejections).toEqual([]);
  });

  test('rejects clipboard text that exceeds the size limit', async ({ page }) => {
    const result = await page.evaluate(() => {
      const oversized = 'a'.repeat(2 * 1024 * 1024);
      return window.__converterHarness.importClipboardText(oversized, 'too-big.txt');
    });

    expect(result.acceptedNames).toEqual([]);
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].code).toBe('CLIPBOARD_TOO_LARGE');
  });
});
