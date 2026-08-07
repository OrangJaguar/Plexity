import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@/api/supabaseClient', () => ({
  getSupabase: () => ({
    functions: { invoke: invokeMock },
  }),
}));

vi.mock('@/api/requireAuth', () => ({
  requireAuth: vi.fn(),
}));

import { requireAuth } from '@/api/requireAuth';
import { listFeedback, updateFeedback } from '@/api/entities/toolsFeedback';

describe('toolsFeedback admin gateway client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists feedback through admin-api for admins', async () => {
    requireAuth.mockResolvedValue({ email: 'admin@example.com', role: 'admin' });
    invokeMock.mockResolvedValue({
      data: { ok: true, data: { items: [{ id: '1', subject: 'Hi' }] } },
      error: null,
    });

    const rows = await listFeedback();
    expect(invokeMock).toHaveBeenCalledWith('admin-api', {
      body: {
        version: 1,
        action: 'feedback.list',
        payload: {},
      },
    });
    expect(rows).toEqual([{ id: '1', subject: 'Hi' }]);
  });

  it('rejects non-admin listFeedback before invoking gateway', async () => {
    requireAuth.mockResolvedValue({ email: 'user@example.com', role: 'user' });
    await expect(listFeedback()).rejects.toThrow('Admin access required');
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('updates feedback through admin-api for admins', async () => {
    requireAuth.mockResolvedValue({ email: 'admin@example.com', role: 'admin' });
    invokeMock.mockResolvedValue({
      data: { ok: true, data: { id: '1', status: 'reviewing' } },
      error: null,
    });

    const updated = await updateFeedback('1', { status: 'reviewing' });
    expect(invokeMock).toHaveBeenCalledWith('admin-api', {
      body: {
        version: 1,
        action: 'feedback.update',
        payload: { id: '1', status: 'reviewing' },
      },
    });
    expect(updated.status).toBe('reviewing');
  });
});
