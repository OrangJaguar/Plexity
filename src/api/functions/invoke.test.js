import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@/api/supabaseClient', () => ({
  getSupabase: () => ({
    functions: { invoke: invokeMock },
  }),
}));

import { invokeBackendFunction } from '@/api/functions/invoke';

describe('invokeBackendFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not peel an extra .data layer from Edge Function JSON', async () => {
    invokeMock.mockResolvedValue({
      data: {
        ok: true,
        data: { items: [{ id: '1', subject: 'Hi' }] },
      },
      error: null,
    });

    const body = await invokeBackendFunction('adminApi', {
      version: 1,
      action: 'feedback.list',
      payload: {},
    });

    expect(body).toEqual({
      ok: true,
      data: { items: [{ id: '1', subject: 'Hi' }] },
    });
  });

  it('keeps market-data { data } wrapper intact', async () => {
    invokeMock.mockResolvedValue({
      data: { data: { chart: { result: [] } } },
      error: null,
    });

    const body = await invokeBackendFunction('toolsMarketData', {
      action: 'yahoo',
      path: '/v8/finance/chart/AAPL',
    });

    expect(body.data).toEqual({ chart: { result: [] } });
  });
});
