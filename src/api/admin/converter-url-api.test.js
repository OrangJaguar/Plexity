import { describe, expect, it, vi } from 'vitest';
import {
  invokeAdminConverterApi,
  converterUrlValidate,
  converterJobCreate,
} from '@/api/admin/converter-url-api.js';

vi.mock('@/api/base44Client', () => ({
  base44: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/api/tools/invoke-response', () => ({
  unwrapFunctionInvoke: (res) => res?.data ?? res,
}));

import { base44 } from '@/api/base44Client';

describe('converter-url-api', () => {
  it('invokes adminConverterApi with versioned envelope', async () => {
    base44.functions.invoke.mockResolvedValueOnce({
      data: { ok: true, data: { entries: [] } },
    });
    await converterUrlValidate(['https://cdn.example.com/a.mp4']);
    expect(base44.functions.invoke).toHaveBeenCalledWith('adminConverterApi', {
      version: 1,
      action: 'converter.url.validate',
      payload: { urls: ['https://cdn.example.com/a.mp4'] },
    });
  });

  it('surfaces sanitized error codes from failed responses', async () => {
    base44.functions.invoke.mockResolvedValueOnce({
      data: { ok: false, error: { message: 'Admin access required.', code: 'ADMIN_REQUIRED' } },
    });
    await expect(invokeAdminConverterApi('session')).rejects.toMatchObject({
      message: 'Admin access required.',
      code: 'ADMIN_REQUIRED',
    });
  });

  it('creates jobs with acknowledgments and idempotency key', async () => {
    base44.functions.invoke.mockResolvedValueOnce({
      data: { ok: true, data: { batchId: 'batch-1', jobs: [] } },
    });
    await converterJobCreate({
      urls: ['https://cdn.example.com/a.mp4'],
      plan: { operationId: 'video-to-mp4' },
      idempotencyKey: 'idem-1',
      sourceRightsAck: true,
    });
    expect(base44.functions.invoke).toHaveBeenCalledWith(
      'adminConverterApi',
      expect.objectContaining({
        action: 'converter.job.create',
        payload: expect.objectContaining({
          idempotencyKey: 'idem-1',
          sourceRightsAck: true,
        }),
      }),
    );
  });
});
