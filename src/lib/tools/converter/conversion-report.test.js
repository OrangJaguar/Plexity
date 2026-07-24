import { describe, expect, it } from 'vitest';
import {
  createConversionReport,
  exportReportJson,
  exportReportMarkdown,
  sanitizeReportForExport,
} from '@/lib/tools/converter/conversion-report.js';

function buildJob(overrides = {}) {
  return {
    id: 'job-1',
    status: 'completed',
    operationId: 'png-to-webp',
    engine: 'native',
    source: { name: 'my-secret-vacation-photo.png' },
    sourceAnalysis: { category: 'image', hasGpsMetadata: true },
    plan: { warnings: ['LOSSY'] },
    output: { size: 12345 },
    checksum: { hex: 'abcdef1234567890' },
    createdAt: 1000,
    updatedAt: 2000,
    error: null,
    ...overrides,
  };
}

describe('conversion-report', () => {
  it('creates a redacted report summarizing job outcomes', () => {
    const report = createConversionReport({ jobs: [buildJob(), buildJob({ id: 'job-2', status: 'failed', error: { code: 'PROCESSING_FAILED' } })] });
    expect(report.jobCount).toBe(2);
    expect(report.succeeded).toBe(1);
    expect(report.failed).toBe(1);
    expect(Object.isFrozen(report)).toBe(true);
  });

  it('never includes the original filename, only a token and extension', () => {
    const report = createConversionReport({ jobs: [buildJob()] });
    const json = JSON.stringify(report);
    expect(json).not.toContain('my-secret-vacation-photo');
    expect(report.items[0].token).toBe('file-1');
    expect(report.items[0].extension).toBe('png');
  });

  it('surfaces a boolean GPS flag rather than raw coordinates', () => {
    const report = createConversionReport({ jobs: [buildJob()] });
    expect(report.items[0].hasGpsMetadata).toBe(true);
    expect(JSON.stringify(report)).not.toMatch(/-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+/);
  });

  it('includes a shortened checksum, not the full hex digest', () => {
    const report = createConversionReport({ jobs: [buildJob()] });
    expect(report.items[0].checksumShort).toBe('abcdef12');
  });

  it('sanitizes an externally-provided report, dropping unknown keys', () => {
    const dirty = {
      generatedAt: 5000,
      items: [
        {
          token: 'file-1',
          extension: 'png',
          category: 'image',
          status: 'completed',
          warnings: [],
          secretPath: '/Users/me/private/photo.png',
        },
      ],
    };
    const clean = sanitizeReportForExport(dirty);
    expect(JSON.stringify(clean)).not.toContain('secretPath');
    expect(JSON.stringify(clean)).not.toContain('private');
  });

  it('exports valid JSON', () => {
    const report = createConversionReport({ jobs: [buildJob()] });
    const json = exportReportJson(report);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('exports a markdown table', () => {
    const report = createConversionReport({ jobs: [buildJob()] });
    const markdown = exportReportMarkdown(report);
    expect(markdown).toContain('# Conversion report');
    expect(markdown).toContain('file-1.png');
    expect(markdown).not.toContain('my-secret-vacation-photo');
  });
});
