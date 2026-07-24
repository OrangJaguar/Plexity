import { describe, expect, it } from 'vitest';
import {
  CONVERSION_OPERATIONS,
  getAcceptAttribute,
  getOperationById,
  listOperationsForCategory,
  listOperationsForInputFormat,
  RECOGNIZED_EXTENSIONS,
  RECOGNIZED_MIMES,
  resolveConversionSupport,
  SUPPORT_REASON,
} from '@/lib/tools/converter/conversion-capabilities.js';
import { detectDeviceProfile } from '@/lib/tools/converter/converter-limits.js';

describe('conversion-capabilities', () => {
  it('defines expanded operations across four categories', () => {
    expect(CONVERSION_OPERATIONS.length).toBeGreaterThan(17);
    expect(listOperationsForCategory('image').length).toBeGreaterThanOrEqual(6);
    expect(listOperationsForCategory('audio').length).toBeGreaterThanOrEqual(1);
    expect(listOperationsForCategory('video').length).toBeGreaterThanOrEqual(4);
    expect(listOperationsForCategory('data').length).toBeGreaterThanOrEqual(6);
  });

  it('includes required operation metadata fields', () => {
    const op = getOperationById('png-to-jpeg');
    expect(op?.engineCandidates.length).toBeGreaterThan(0);
    expect(op?.resourceClass).toBeTruthy();
    expect(op?.label).toBeTruthy();
    expect(op?.metadataEffects).toBeTruthy();
  });

  it('keeps Plan 2 operations working', () => {
    expect(getOperationById('png-to-jpeg')?.outputFormat).toBe('jpeg');
    expect(getOperationById('wav-transform')?.adapter).toBe('wav');
    expect(getOperationById('csv-to-json')?.adapter).toBe('data');
    expect(getOperationById('mp4-remux')?.adapter).toBe('video');
  });

  it('lists operations for input format', () => {
    expect(listOperationsForInputFormat('png').some((o) => o.id === 'png-to-jpeg')).toBe(true);
    expect(listOperationsForInputFormat('yaml').length).toBeGreaterThan(0);
  });

  it('builds accept attribute with extensions and mimes', () => {
    const accept = getAcceptAttribute('data');
    expect(accept).toContain('.csv');
    expect(accept).toContain('application/json');
    expect(accept).toContain('.yaml');
  });

  it('exports recognized extensions and mimes', () => {
    expect(RECOGNIZED_EXTENSIONS).toContain('webp');
    expect(RECOGNIZED_EXTENSIONS).toContain('yaml');
    expect(RECOGNIZED_MIMES).toContain('video/mp4');
  });

  it('resolveConversionSupport fails closed without workers', () => {
    const profile = detectDeviceProfile({ hasWorkers: false });
    const result = resolveConversionSupport('png-to-jpeg', profile);
    expect(result.supported).toBe(false);
    expect(result.status).toBe('unsupported');
    expect(result.reason).toBe(SUPPORT_REASON.WORKERS_UNAVAILABLE);
  });

  it('resolveConversionSupport passes with full desktop profile', () => {
    const profile = detectDeviceProfile({
      hasWorkers: true,
      hasOffscreenCanvas: true,
      hasVideoEncoder: true,
      hasOpfs: true,
    });
    const result = resolveConversionSupport('csv-to-json', profile);
    expect(result.supported).toBe(true);
    expect(result.status).toBe('available');
    expect(result.reason).toBe(SUPPORT_REASON.SUPPORTED);
  });

  it('requires video encoder for cross-container transcode ops', () => {
    const profile = detectDeviceProfile({
      hasWorkers: true,
      hasOffscreenCanvas: true,
      hasVideoEncoder: false,
    });
    expect(resolveConversionSupport('mp4-to-webm', profile).supported).toBe(false);
    expect(resolveConversionSupport('mp4-remux', profile).supported).toBe(true);
  });

  it('marks ffmpeg ops unsupported when feature flag disabled', () => {
    const profile = detectDeviceProfile({ hasWorkers: true });
    const result = resolveConversionSupport('wav-to-mp3', profile, { enableFfmpeg: false });
    expect(result.supported).toBe(false);
    expect(result.reason).toBe(SUPPORT_REASON.FFMPEG_DISABLED);
  });

  it('rollback: native image and data ops stay supported with ENABLE_FFMPEG disabled', () => {
    const profile = detectDeviceProfile({
      hasWorkers: true,
      hasOffscreenCanvas: true,
      hasVideoEncoder: true,
      hasOpfs: true,
    });

    const image = resolveConversionSupport('png-to-jpeg', profile, { enableFfmpeg: false });
    expect(image.supported).toBe(true);

    const csv = resolveConversionSupport('csv-to-json', profile, { enableFfmpeg: false });
    expect(csv.supported).toBe(true);
    expect(csv.status).toBe('available');

    // mp4-remux only lists ffmpeg as a fallback candidate (mediabunny is primary),
    // so it should also stay available when ffmpeg itself is disabled.
    const remux = resolveConversionSupport('mp4-remux', profile, { enableFfmpeg: false });
    expect(remux.supported).toBe(true);
  });

  it('returns available-with-warning for lossy ops', () => {
    const profile = detectDeviceProfile({ hasWorkers: true, hasOffscreenCanvas: true });
    const result = resolveConversionSupport('png-to-jpeg', profile);
    expect(result.status).toBe('available-with-warning');
    expect(result.warnings.some((w) => w.code === 'LOSSY')).toBe(true);
  });
});
