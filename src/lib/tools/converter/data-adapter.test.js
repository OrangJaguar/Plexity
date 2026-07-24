import { describe, expect, it } from 'vitest';
import {
  parseDataText,
  serializeDataRows,
  validateDataRows,
  DATA_LIMITS,
} from '@/lib/tools/converter/adapters/data-adapter.js';

describe('data-adapter', () => {
  it('parses CSV to rows', () => {
    const rows = parseDataText('a,b\n1,2\n', 'csv');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ a: '1', b: '2' });
  });

  it('parses TSV to rows', () => {
    const rows = parseDataText('a\tb\n1\t2\n', 'tsv');
    expect(rows[0]).toEqual({ a: '1', b: '2' });
  });

  it('parses JSON arrays', () => {
    const rows = parseDataText('[{"x":1}]', 'json');
    expect(rows).toEqual([{ x: 1 }]);
  });

  it('serializes rows to JSON deterministically', () => {
    const rows = [{ a: '1' }];
    const out = serializeDataRows(rows, 'json', { pretty: false });
    expect(out).toBe('[{"a":"1"}]');
  });

  it('serializes rows to TSV', () => {
    const rows = [{ a: '1', b: '2' }];
    const out = serializeDataRows(rows, 'tsv');
    expect(out).toContain('\t');
  });

  it('enforces row limits', () => {
    const rows = Array.from({ length: DATA_LIMITS.MAX_ROWS + 1 }, (_, i) => ({ i: String(i) }));
    expect(() => validateDataRows(rows)).toThrow(/Row count/);
  });
});
