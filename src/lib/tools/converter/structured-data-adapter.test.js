import { describe, expect, it } from 'vitest';
import {
  parseStructuredText,
  parseXmlText,
  parseYamlText,
  serializeStructuredData,
} from '@/lib/tools/converter/adapters/structured-data-adapter.js';

describe('structured-data-adapter', () => {
  it('parses and serializes YAML without custom tags', () => {
    const data = parseYamlText('name: test\nvalue: 1');
    expect(data).toEqual({ name: 'test', value: 1 });
    const out = serializeStructuredData(data, 'yaml');
    expect(out).toContain('name: test');
  });

  it('parses XML with attributes and no entity expansion', () => {
    const data = parseXmlText('<root id="1"><item>ok</item></root>');
    expect(data.root.item).toBe('ok');
    expect(data.root['@_id']).toBe('1');
  });

  it('converts JSON to YAML and back through structured pipeline', () => {
    const rows = parseStructuredText('[{"a":1}]', 'json');
    const yaml = serializeStructuredData(rows, 'yaml');
    const roundTrip = parseYamlText(yaml);
    expect(roundTrip).toEqual([{ a: 1 }]);
  });

  it('converts txt lines to csv', () => {
    const rows = parseStructuredText('one\ntwo\nthree', 'txt');
    const csv = serializeStructuredData(rows, 'csv');
    expect(csv).toContain('one');
    expect(csv).toContain('value');
  });
});
