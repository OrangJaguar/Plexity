import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/base44Client', () => ({
  base44: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/api/requireAuth', () => ({
  requireAuth: vi.fn(),
}));

import { base44 } from '@/api/base44Client';
import { requireAuth } from '@/api/requireAuth';
import { listFeedback, updateFeedback } from '@/api/entities/toolsFeedback';

describe('toolsFeedback admin gateway client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists feedback through adminApi for admins', async () => {
    requireAuth.mockResolvedValue({ email: 'admin@example.com', role: 'admin' });
    base44.functions.invoke.mockResolvedValue({
      data: { ok: true, data: { items: [{ id: '1', subject: 'Hi' }] } },
    });

    const rows = await listFeedback();
    expect(base44.functions.invoke).toHaveBeenCalledWith('adminApi', {
      version: 1,
      action: 'feedback.list',
      payload: {},
    });
    expect(rows).toEqual([{ id: '1', subject: 'Hi' }]);
  });

  it('rejects non-admin listFeedback before invoking gateway', async () => {
    requireAuth.mockResolvedValue({ email: 'user@example.com', role: 'user' });
    await expect(listFeedback()).rejects.toThrow('Admin access required');
    expect(base44.functions.invoke).not.toHaveBeenCalled();
  });

  it('updates feedback through adminApi for admins', async () => {
    requireAuth.mockResolvedValue({ email: 'admin@example.com', role: 'admin' });
    base44.functions.invoke.mockResolvedValue({
      data: { ok: true, data: { id: '1', status: 'reviewing' } },
    });

    const updated = await updateFeedback('1', { status: 'reviewing' });
    expect(base44.functions.invoke).toHaveBeenCalledWith('adminApi', {
      version: 1,
      action: 'feedback.update',
      payload: { id: '1', status: 'reviewing' },
    });
    expect(updated.status).toBe('reviewing');
  });
});
