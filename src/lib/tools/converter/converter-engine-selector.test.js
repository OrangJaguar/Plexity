import { describe, expect, it } from 'vitest';
import { getOperationById } from '@/lib/tools/converter/conversion-capabilities.js';
import { CONVERSION_OPERATIONS } from '@/lib/tools/converter/conversion-operations.js';
import { selectConversionEngine } from '@/lib/tools/converter/converter-engine-selector.js';
import { detectDeviceProfile } from '@/lib/tools/converter/converter-limits.js';

describe('converter-engine-selector', () => {
  const desktop = detectDeviceProfile({
    hasWorkers: true,
    hasOffscreenCanvas: true,
    hasCreateImageBitmap: true,
    hasVideoEncoder: true,
  });

  it('prefers native-image for image ops', () => {
    const op = getOperationById('png-to-jpeg');
    const { engine, reason } = selectConversionEngine(op, desktop);
    expect(engine).toBe('native-image');
    expect(reason).toContain('Native');
  });

  it('prefers wav adapter for wav transform', () => {
    const op = getOperationById('wav-transform');
    const { engine } = selectConversionEngine(op, desktop);
    expect(engine).toBe('wav');
  });

  it('prefers data adapter for csv conversions', () => {
    const op = getOperationById('csv-to-json');
    const { engine } = selectConversionEngine(op, desktop);
    expect(engine).toBe('data');
  });

  it('falls back to ffmpeg for ffmpeg-only audio ops', () => {
    const op = getOperationById('wav-to-mp3');
    const { engine } = selectConversionEngine(op, desktop, { ffmpegLoaded: true });
    expect(engine).toBe('ffmpeg');
  });

  it('prefers mediabunny before ffmpeg for remux ops', () => {
    const op = getOperationById('mp4-remux');
    const { engine } = selectConversionEngine(op, desktop, { ffmpegLoaded: true });
    expect(engine).toBe('mediabunny');
  });

  it('prefers ffmpeg for merge operations when enabled', () => {
    const op = {
      ...getOperationById('mp4-remux'),
      id: 'merge-mp4',
    };
    const { engine } = selectConversionEngine(op, desktop, { ffmpegLoaded: true });
    expect(engine).toBe('ffmpeg');
  });

  it('prefers ffmpeg when targetBytes is set', () => {
    const op = getOperationById('mp4-remux');
    const { engine } = selectConversionEngine(op, desktop, {
      ffmpegLoaded: true,
      options: { targetBytes: 1024 * 1024 },
    });
    expect(engine).toBe('ffmpeg');
  });

  it('keeps backward-compatible video option defaults', () => {
    const op = CONVERSION_OPERATIONS.find((entry) => entry.id === 'mp4-to-webm');
    expect(op?.options.some((field) => field.key === 'videoBitrateKbps')).toBe(true);
    expect(op?.options.some((field) => field.key === 'fps' && field.defaultValue === 30)).toBe(true);
  });
});
