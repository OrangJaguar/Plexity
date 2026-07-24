import { test, expect } from '@playwright/test';

test.describe('converter v2 advanced harness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__converterHarness?.mapDestinationToPlan);
  });

  test('goal assistant and compatibility presets produce deterministic plans', async ({ page }) => {
    const result = await page.evaluate(() => {
      const destinations = window.__converterHarness.listAssistantDestinations();
      const destinationIds = window.__converterHarness.listAssistantDestinations();
      const websiteDestination = destinationIds.find((id) => id === 'website' || id === 'profile:website') ?? 'website';
      const website = window.__converterHarness.mapDestinationToPlan(websiteDestination, {
        category: 'image',
        format: 'png',
        width: 32,
        height: 32,
        hasAlpha: true,
      });
      const underSize = window.__converterHarness.resolvePresetPlan('under-size', {
        category: 'image',
        format: 'png',
        width: 64,
        height: 64,
      }, { targetBytes: 50_000 });
      return { destinations, website, underSize, websiteDestination };
    });

    const websiteId = result.destinations.find((id) => id === 'website' || id === 'profile:website');
    expect(websiteId).toBeTruthy();
    expect(result.website?.operationId).toBeTruthy();
    expect(result.website?.compatibilityProfile === 'website' || result.website?.operationId).toBeTruthy();
    expect(result.underSize?.goalId).toBe('under-size');
    expect(result.underSize?.warnings).toContain('TARGET_SIZE_APPROX');
  });

  test('target-size planner returns approximate strategy without exact guarantees', async ({ page }) => {
    const plan = await page.evaluate(() => window.__converterHarness.planTargetSize({
      category: 'video',
      durationSec: 30,
      targetBytes: 2_000_000,
      allowTwoPass: true,
    }));

    expect(plan?.bitrateKbps).toBeGreaterThan(0);
    expect(plan?.warnings).toContain('TARGET_SIZE_APPROX');
    expect(plan?.passStrategy).toBeTruthy();
  });

  test('recipe export/import/apply round-trips', async ({ page }) => {
    const result = await page.evaluate(() => {
      const roundTrip = window.__converterHarness.recipeRoundTrip({
        id: 'harness-webp',
        label: 'Harness WebP',
        appliesTo: { category: ['image'], format: ['png'] },
        planTemplate: { operationId: 'png-to-webp', options: { quality: 0.8 } },
      });
      const applied = window.__converterHarness.applyRecipe({
        id: 'harness-webp',
        label: 'Harness WebP',
        appliesTo: { category: ['image'], format: ['png'] },
        planTemplate: { operationId: 'png-to-webp', options: { quality: 0.8 } },
      }, { category: 'image', format: 'png', width: 16, height: 16 });
      return { roundTrip, applied };
    });

    expect(result.roundTrip.ok).toBe(true);
    expect(result.applied?.operationId).toBe('png-to-webp');
  });

  test('merge and split validation enforce compatibility and fan-out limits', async ({ page }) => {
    const result = await page.evaluate(() => {
      const okMerge = window.__converterHarness.validateMerge([
        { category: 'audio', sampleRate: 44100, channels: 2 },
        { category: 'audio', sampleRate: 44100, channels: 2 },
      ]);
      const badMerge = window.__converterHarness.validateMerge([
        { category: 'audio', sampleRate: 44100, channels: 2 },
        { category: 'video', width: 100, height: 100 },
      ]);
      const okSplit = window.__converterHarness.estimateSplit({
        spec: { mode: 'count', value: 4 },
      });
      const badSplit = window.__converterHarness.estimateSplit({
        spec: { mode: 'count', value: 99 },
      });
      return {
        okMerge,
        badMerge,
        okSplitCount: typeof okSplit === 'number' ? okSplit : okSplit?.count,
        okSplitOk: typeof okSplit === 'number' ? okSplit > 0 : Boolean(okSplit?.ok),
        badSplitOk: typeof badSplit === 'number' ? badSplit <= 20 : Boolean(badSplit?.ok),
        badSplitRaw: badSplit,
      };
    });

    expect(result.okMerge.ok).toBe(true);
    expect(result.badMerge.ok).toBe(false);
    expect(result.okSplitOk).toBe(true);
    expect(result.okSplitCount).toBe(4);
    // Fan-out above max segments should fail validation or return null/invalid.
    expect(result.badSplitOk).toBe(false);
  });

  test('checksum/report export stays redacted and structured ZIP options work', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const sample = btoa('checksum-sample');
      const checksum = await window.__converterHarness.checksumOfBase64(sample);
      const report = window.__converterHarness.buildReport([{
        id: 'job-1',
        status: 'completed',
        operationId: 'png-to-webp',
        source: { name: 'private-gps.png' },
        output: { size: 2048 },
        checksum: checksum.hex,
        plan: { warnings: ['LOSSY'], compatibilityProfile: 'website' },
      }]);
      const zip = await window.__converterHarness.packageFilesAdvanced([
        { name: 'a.png', relativePath: 'photos/a.png', base64: sample },
        { name: 'b.png', relativePath: 'photos/b.png', base64: sample },
      ], { preserveStructure: true, flatten: false, includeChecksumSidecar: true });
      return { checksum, report, zip };
    });

    expect(result.checksum.hex).toHaveLength(64);
    expect(result.report.json).not.toContain('private-gps.png');
    expect(result.report.markdown).not.toMatch(/gps/i);
    expect(result.zip.size).toBeGreaterThan(0);
  });

  test('public empty / admin additive url.import and no eager FFmpeg preload', async ({ page }) => {
    await page.waitForTimeout(250);
    const result = await page.evaluate(() => {
      const parity = window.__converterHarness.getCapabilityParity();
      const ffmpegRequestCount = performance
        .getEntriesByType('resource')
        .filter((entry) => entry.name.includes('ffmpeg-core')).length;
      return { parity, ffmpegRequestCount, flags: window.__converterHarness.getV2Flags() };
    });

    expect(result.parity.public).toEqual({});
    expect(result.parity.adminDelta).toEqual({
      'converter.url.import': true,
      'converter.playlist.import': true,
      'converter.package.create': true,
      'converter.ai.assist': true,
      'converter.ai.ocr': true,
      'converter.ai.transcribe': true,
    });
    expect(result.parity.admin).toEqual({
      'converter.url.import': true,
      'converter.playlist.import': true,
      'converter.package.create': true,
      'converter.ai.assist': true,
      'converter.ai.ocr': true,
      'converter.ai.transcribe': true,
    });
    expect(result.ffmpegRequestCount).toBe(0);
    expect(result.flags.ENABLE_V2_TARGET_SIZE).toBe(true);
  });
});
