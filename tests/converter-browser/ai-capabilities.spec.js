import { test, expect } from '@playwright/test';

test.describe('converter plan 7 AI harness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__converterHarness?.getCapabilityParity);
  });

  test('public has no AI caps; admin exposes assist/ocr/transcribe', async ({ page }) => {
    const parity = await page.evaluate(() => window.__converterHarness.getCapabilityParity());
    expect(parity.public).toEqual({});
    expect(parity.admin['converter.ai.assist']).toBe(true);
    expect(parity.admin['converter.ai.ocr']).toBe(true);
    expect(parity.admin['converter.ai.transcribe']).toBe(true);
  });

  test('mocked NL assist reviews and applies plan to harness job', async ({ page }) => {
    const result = await page.evaluate(async () => {
      return window.__converterHarness.mockAiAssistApply({
        request: 'compress this video for email under size',
        job: { id: 'job-1' },
      });
    });
    expect(result.ok).toBe(true);
    expect(result.plan.operationId).toBeTruthy();
    expect(result.appliedJob.operationId).toBe(result.plan.operationId);
  });

  test('mocked OCR and transcribe produce downloadable sidecars', async ({ page }) => {
    const result = await page.evaluate(async () => {
      return window.__converterHarness.mockAiOcrAndTranscribe();
    });
    expect(result.ocrSidecar).toContain('Sample OCR');
    expect(result.transcriptSidecar).toContain('Hello world');
    expect(result.vtt).toMatch(/^WEBVTT/);
  });

  test('does not fetch AI provider hosts from harness load', async ({ page }) => {
    await page.waitForTimeout(250);
    const hits = await page.evaluate(() => performance
      .getEntriesByType('resource')
      .filter((e) => /openai|anthropic|api\.openai/i.test(e.name)).length);
    expect(hits).toBe(0);
  });
});
