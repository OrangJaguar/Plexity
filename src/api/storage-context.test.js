import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getStorageContext } from '@/api/storage-context';

vi.mock('@/api/base44Client', () => ({
  base44: {
    auth: {
      isAuthenticated: vi.fn(),
      me: vi.fn(),
    },
  },
}));

import { base44 } from '@/api/base44Client';

describe('getStorageContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication', async () => {
    base44.auth.isAuthenticated.mockResolvedValue(false);
    await expect(getStorageContext()).rejects.toThrow();
  });

  it('returns cloud context for signed-in users', async () => {
    base44.auth.isAuthenticated.mockResolvedValue(true);
    base44.auth.me.mockResolvedValue({ email: 'user@example.com' });
    await expect(getStorageContext()).resolves.toEqual({
      mode: 'cloud',
      userEmail: 'user@example.com',
    });
  });
});
