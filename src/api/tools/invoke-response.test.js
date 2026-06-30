import { describe, expect, it } from 'vitest';
import { unwrapFunctionInvoke } from '@/api/tools/invoke-response';

describe('unwrapFunctionInvoke', () => {
  it('unwraps axios-style responses', () => {
    expect(unwrapFunctionInvoke({ data: { data: { ok: true } } })).toEqual({ data: { ok: true } });
  });

  it('passes through already-unwrapped bodies', () => {
    expect(unwrapFunctionInvoke({ results: [] })).toEqual({ results: [] });
  });

  it('throws on error payloads', () => {
    expect(() => unwrapFunctionInvoke({ data: { error: { message: 'Unauthorized' } } }))
      .toThrow('Unauthorized');
  });
});
