import { describe, expect, it } from 'vitest';
import { createConversionPlan } from '@/lib/tools/converter/conversion-plan.js';
import {
  applyRecipeToSource,
  createRecipe,
  exportRecipeJson,
  importRecipeJson,
  validateRecipe,
} from '@/lib/tools/converter/converter-recipes.js';
import { resolveCompatibilityPlan, listCompatibilityProfiles } from '@/lib/tools/converter/compatibility-profiles.js';
import { mapDestinationToPlan, listAssistantDestinations } from '@/lib/tools/converter/goal-assistant.js';
import { planTargetSize, isWithinTargetTolerance, suggestSecondPassBitrate } from '@/lib/tools/converter/target-size-planner.js';
import { estimateOutputSize } from '@/lib/tools/converter/output-estimate.js';
import { previewTemplate, renderFilenameTemplate } from '@/lib/tools/converter/filename-templates.js';
import { validateMergeCompatibility, createMergePlan, MERGE_LIMITS } from '@/lib/tools/converter/merge-plan.js';
import { estimateSplitCount, createSplitSpec, validateSplitSpec, SPLIT_LIMITS } from '@/lib/tools/converter/split-plan.js';
import { sha256Hex, formatChecksumShort } from '@/lib/tools/converter/checksums.js';
import { createConversionReport, exportReportMarkdown, exportReportJson } from '@/lib/tools/converter/conversion-report.js';
import { createSessionHistory } from '@/lib/tools/converter/session-history.js';
import { createJob, ERROR_CODES, normalizeJob } from '@/lib/tools/converter/converter-job-model.js';
import { CONVERTER_FEATURE_FLAGS } from '@/lib/tools/converter/converter-feature-flags.js';
import { normalizeSourceAnalysis } from '@/lib/tools/converter/source-analysis.js';

const imageSource = Object.freeze({
  category: 'image',
  format: 'png',
  width: 32,
  height: 32,
  durationSec: null,
  channels: null,
  sampleRate: null,
  codec: null,
  container: 'png',
  tracks: [],
  subtitleTracks: [],
  rowCount: null,
  columnCount: null,
  hasAlpha: true,
  animated: false,
  hasGpsMetadata: false,
  hasMetadata: true,
  colorProfile: 'srgb',
  corruptionSignals: [],
  warnings: [],
});

describe('converter v2 core', () => {
  it('exposes V2 feature flags', () => {
    expect(CONVERTER_FEATURE_FLAGS.ENABLE_V2_TWO_PASS).toBe(true);
    expect(CONVERTER_FEATURE_FLAGS.ENABLE_V2_MERGE_SPLIT).toBe(true);
    expect(CONVERTER_FEATURE_FLAGS.ENABLE_V2_TARGET_SIZE).toBe(true);
    expect(CONVERTER_FEATURE_FLAGS.ENABLE_V2_RECIPES).toBe(true);
  });

  it('normalizes V2 plan fields and migrates V1 plans', () => {
    const plan = createConversionPlan({
      goalId: 'under-size',
      operationId: 'png-to-webp',
      targetBytes: 1000,
      passStrategy: 'auto',
      metadataPolicy: 'strip-gps',
      namingTemplate: '{name}.{ext}',
      checksumPolicy: 'sha256',
    });
    expect(plan.schemaVersion).toBe(2);
    expect(plan.targetBytes).toBe(1000);
    expect(plan.passStrategy).toBe('auto');
    expect(plan.metadataPolicy).toBe('strip-gps');

    const v1 = createConversionPlan({ goalId: 'x', operationId: 'csv-to-json' });
    expect(v1.recipeId).toBeNull();
    expect(v1.splitSpec).toBeNull();
    expect(v1.checksumPolicy).toBe('none');
  });

  it('validates and round-trips recipes', () => {
    const recipe = createRecipe({
      id: 'web-webp',
      label: 'Web WebP',
      appliesTo: { category: ['image'], format: ['png'] },
      planTemplate: { operationId: 'png-to-webp', options: { quality: 0.8 }, warnings: ['LOSSY'] },
    });
    expect(recipe).toBeTruthy();
    const json = exportRecipeJson(recipe);
    const imported = importRecipeJson(json);
    expect(imported?.id).toBe('web-webp');
    const applied = applyRecipeToSource(imported, imageSource);
    expect(applied?.plan.operationId).toBe('png-to-webp');
    expect(validateRecipe({ schema: 'nope', id: 'x', label: 'x', planTemplate: { operationId: 'png-to-webp' } }).ok).toBe(false);
  });

  it('maps compatibility destinations and assistant goals', () => {
    expect(listCompatibilityProfiles().length).toBeGreaterThanOrEqual(9);
    const resolved = resolveCompatibilityPlan('website', imageSource);
    expect(resolved?.plan.operationId).toBeTruthy();
    expect(listAssistantDestinations().length).toBeGreaterThan(10);
    const suggestion = mapDestinationToPlan('profile:website', imageSource);
    expect(suggestion?.plan.compatibilityProfile).toBe('website');
    expect(suggestion?.explanation).toMatch(/web/i);
  });

  it('plans approximate target sizes', () => {
    const plan = planTargetSize({
      category: 'video',
      durationSec: 60,
      targetBytes: 5_000_000,
      allowTwoPass: true,
    });
    expect(plan?.bitrateKbps).toBeGreaterThan(0);
    expect(plan?.warnings).toContain('TARGET_SIZE_APPROX');
    expect(isWithinTargetTolerance(5_100_000, 5_000_000, 0.12)).toBe(true);
    expect(suggestSecondPassBitrate({
      firstPassBytes: 8_000_000,
      targetBytes: 5_000_000,
      firstPassBitrateKbps: 2000,
    })).toBeLessThan(2000);
  });

  it('estimates output size with uncertainty', () => {
    const estimate = estimateOutputSize({
      category: 'image',
      sourceBytes: 1_000_000,
      operation: { lossy: true, outputFormat: 'webp' },
      options: { quality: 0.8 },
    });
    expect(estimate.bytes).toBeGreaterThan(0);
    expect(estimate.uncertainty).toBeTruthy();
  });

  it('renders collision-safe filename templates', () => {
    const used = new Set(['sample.webp']);
    const name = renderFilenameTemplate('{name}.{ext}', { name: 'sample', ext: 'webp' }, used);
    expect(name).toBe('sample (2).webp');
    expect(previewTemplate('{preset}-{index}.{ext}')).toContain('web-optimized');
  });

  it('validates merge compatibility and split fan-out', () => {
    expect(validateMergeCompatibility([
      { category: 'audio', sampleRate: 44100, channels: 2 },
      { category: 'audio', sampleRate: 44100, channels: 2 },
    ]).ok).toBe(true);
    expect(validateMergeCompatibility([
      { category: 'audio', sampleRate: 44100, channels: 2 },
      { category: 'video' },
    ]).ok).toBe(false);
    expect(createMergePlan({
      sourceJobIds: ['a', 'b'],
      category: 'audio',
      outputFormat: 'mp3',
    }).sourceJobIds).toHaveLength(2);
    expect(MERGE_LIMITS.maxInputs).toBe(12);

    const splitSpec = createSplitSpec({ mode: 'count', value: 4 });
    expect(estimateSplitCount(splitSpec)).toBe(4);
    const oversized = createSplitSpec({ mode: 'count', value: SPLIT_LIMITS.maxSegments + 1 });
    expect(validateSplitSpec(oversized).ok).toBe(false);
  });

  it('computes checksums and redacted reports/history', async () => {
    const hex = await sha256Hex(new TextEncoder().encode('plexity'));
    expect(hex).toHaveLength(64);
    expect(formatChecksumShort(hex)).toHaveLength(8);

    const report = createConversionReport({
      jobs: [{
        id: 'job-1',
        status: 'completed',
        operationId: 'png-to-webp',
        source: { name: 'secret-gps.png' },
        sourceAnalysis: { category: 'image', hasGpsMetadata: true },
        output: { size: 12345 },
        checksum: { hex },
        plan: { warnings: ['LOSSY'], compatibilityProfile: 'website' },
      }],
    });
    const json = exportReportJson(report);
    const md = exportReportMarkdown(report);
    expect(json).not.toContain('secret-gps.png');
    expect(report.items[0].hasGpsMetadata).toBe(true);
    expect(md).toContain('# Conversion report');

    const history = createSessionHistory();
    expect(history.add({
      name: 'private.mov',
      status: 'completed',
      category: 'video',
    })).toBeTruthy();
    expect(history.list()[0].extension).toBe('mov');
    expect(JSON.stringify(history.list())).not.toContain('private.mov');
    history.dispose();
  });

  it('migrates V1 jobs to V2 shape and includes new error codes', () => {
    expect(ERROR_CODES.TARGET_SIZE_FAILED).toBe('TARGET_SIZE_FAILED');
    expect(ERROR_CODES.MERGE_INCOMPATIBLE).toBe('MERGE_INCOMPATIBLE');
    const job = createJob({ source: { name: 'a.png', size: 10 } });
    expect(job.parentJobId).toBeNull();
    expect(job.childJobIds).toEqual([]);
    expect(job.relativePath).toBeNull();
    const migrated = normalizeJob({
      id: 'legacy',
      attemptId: 'a1',
      status: 'waiting',
      source: { name: 'a.png', size: 1 },
    });
    expect(Array.isArray(migrated.outputs)).toBe(true);
    expect(migrated.outputs).toHaveLength(0);
    expect(migrated.checksum).toBeNull();
  });

  it('enriches source analysis with V2 fields', () => {
    const analysis = normalizeSourceAnalysis({
      adapterAnalysis: {
        format: 'mp4',
        category: 'video',
        hasGpsMetadata: true,
        subtitleTracks: [{ type: 'subtitle', language: 'en' }],
        colorProfile: 'bt709',
        corruptionSignals: ['truncated-mismatch'],
      },
    });
    expect(analysis.hasGpsMetadata).toBe(true);
    expect(analysis.subtitleTracks).toHaveLength(1);
    expect(analysis.warnings).toContain('GPS_METADATA');
  });
});
