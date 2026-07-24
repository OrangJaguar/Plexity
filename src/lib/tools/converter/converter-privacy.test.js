import { describe, expect, it } from 'vitest';
import {
  assertLocalOnlyContext,
  redactStatusMessage,
  sanitizeTelemetryProps,
} from '@/lib/tools/converter/converter-privacy.js';

describe('converter-privacy', () => {
  it('keeps allowlisted enum props', () => {
    const sanitized = sanitizeTelemetryProps({
      category: 'image',
      outcome: 'success',
      engine: 'ffmpeg',
      presetId: 'make-smaller',
      statusCode: 'FILE_TOO_LARGE',
    });
    expect(sanitized).toEqual({
      category: 'image',
      outcome: 'success',
      engine: 'ffmpeg',
      presetId: 'make-smaller',
      statusCode: 'FILE_TOO_LARGE',
    });
  });

  it('keeps boolean flags regardless of key name shape', () => {
    const sanitized = sanitizeTelemetryProps({ retried: true, ackShown: false });
    expect(sanitized).toEqual({ retried: true, ackShown: false });
  });

  it('drops unknown keys and invalid enum values', () => {
    const sanitized = sanitizeTelemetryProps({
      category: 'not-a-category',
      outcome: 'maybe',
      engine: 'gpu',
      random: 'value',
    });
    expect(sanitized).toEqual({});
  });

  it('drops forbidden keys even when the value is a string', () => {
    const sanitized = sanitizeTelemetryProps({
      fileName: 'secret.png',
      sourcePath: '/Users/me/secret.png',
      category: 'image',
    });
    expect(sanitized).toEqual({ category: 'image' });
  });

  it('drops forbidden keys even when the value is boolean', () => {
    const sanitized = sanitizeTelemetryProps({ hasFileName: true, isLargeFile: false });
    expect(sanitized).toEqual({});
  });

  it('rejects non-object input', () => {
    expect(sanitizeTelemetryProps(null)).toEqual({});
    expect(sanitizeTelemetryProps(undefined)).toEqual({});
    expect(sanitizeTelemetryProps('nope')).toEqual({});
  });

  it('allows V2 outcome telemetry enums', () => {
    const sanitized = sanitizeTelemetryProps({
      goalId: 'under-size',
      mergeStatus: 'SUCCESS',
      splitStatus: 'PARTIAL',
      targetSizeStatus: 'APPROX',
      recipeApplied: true,
    });
    expect(sanitized.goalId).toBe('under-size');
    expect(sanitized.mergeStatus).toBe('SUCCESS');
    expect(sanitized.recipeApplied).toBe(true);
  });

  it('rejects oversized or malformed presetId/statusCode', () => {
    const sanitized = sanitizeTelemetryProps({
      presetId: 'Make Smaller!',
      statusCode: 'file too large',
    });
    expect(sanitized).toEqual({});
  });

  it('keeps privacy-safe V2 telemetry enums and drops sensitive props', () => {
    const sanitized = sanitizeTelemetryProps({
      goalId: 'under-size',
      v2Feature: 'target-size',
      recipeApplied: true,
      fileName: 'secret.png',
      exactBytes: 1234,
      gpsLat: '1.23',
    });
    expect(sanitized).toEqual({
      goalId: 'under-size',
      v2Feature: 'target-size',
      recipeApplied: true,
    });
  });

  it('keeps Plan 7 AI enum buckets and drops prompts', () => {
    const sanitized = sanitizeTelemetryProps({
      aiAction: 'assist.plan',
      provider: 'openai-compatible',
      tokenBucket: '500to2k',
      costUsdBucket: '1cto10c',
      prompt: 'ignore me',
    });
    expect(sanitized).toEqual({
      aiAction: 'assist.plan',
      provider: 'openai-compatible',
      tokenBucket: '500to2k',
      costUsdBucket: '1cto10c',
    });
  });

  it('redacts filenames and paths from status messages', () => {
    expect(redactStatusMessage('Failed to read /Users/me/Documents/report.csv')).toBe(
      'Failed to read <path>',
    );
    expect(redactStatusMessage('Could not decode photo.png')).toBe('Could not decode <file>');
  });

  it('handles empty/invalid redaction input', () => {
    expect(redactStatusMessage('')).toBe('');
    expect(redactStatusMessage(null)).toBe('');
    expect(redactStatusMessage(undefined)).toBe('');
  });

  it('exposes a local-only context assertion helper', () => {
    expect(assertLocalOnlyContext()).toBe(true);
  });
});
