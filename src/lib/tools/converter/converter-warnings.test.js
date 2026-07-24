import { describe, expect, it } from 'vitest';
import {
  formatWarning,
  getWarningMessage,
  isDestructiveWarning,
  resolveWarnings,
  WARNING_CODES,
  WARNING_MESSAGES,
} from '@/lib/tools/converter/converter-warnings.js';

describe('converter-warnings', () => {
  it('defines stable warning codes', () => {
    expect(WARNING_MESSAGES.LOSSY).toContain('lossy');
    expect(WARNING_MESSAGES.FFMPEG_REQUIRED).toContain('FFmpeg');
  });

  it('resolves warning messages by code', () => {
    const warnings = resolveWarnings(['LOSSY', 'FLATTEN_ALPHA']);
    expect(warnings).toHaveLength(2);
    expect(warnings[0].code).toBe('LOSSY');
    expect(warnings[0].message).toBe(getWarningMessage('LOSSY'));
  });

  it('defines V2 warning codes for recipes, sizing, merge/split, and estimates', () => {
    for (const code of [
      'GPS_METADATA',
      'STRIP_METADATA',
      'TARGET_SIZE_APPROX',
      'MERGE_LOSSY',
      'SPLIT_LOSSY',
      'ESTIMATE_UNCERTAIN',
      'STRUCTURE_PRESERVE',
      'TWO_PASS',
    ]) {
      expect(WARNING_CODES[code]).toBe(code);
      expect(typeof WARNING_MESSAGES[code]).toBe('string');
      expect(WARNING_MESSAGES[code].length).toBeGreaterThan(0);
    }
  });

  it('formats V2 warnings with a severity', () => {
    expect(formatWarning('TARGET_SIZE_APPROX').severity).toBe('info');
    expect(formatWarning('GPS_METADATA').severity).toBe('destructive');
    expect(isDestructiveWarning('MERGE_LOSSY')).toBe(true);
  });
});
