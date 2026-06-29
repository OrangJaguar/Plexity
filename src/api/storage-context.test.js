import { describe, expect, it, vi, beforeEach } from 'vitest';
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

  it('returns guest mode when unsigned', async () => {
    base44.auth.isAuthenticated.mockResolvedValue(false);
    await expect(getStorageContext()).resolves.toEqual({ mode: 'guest' });
  });

  it('returns cloud mode with email when signed in', async () => {
    base44.auth.isAuthenticated.mockResolvedValue(true);
    base44.auth.me.mockResolvedValue({ email: 'user@example.com' });
    await expect(getStorageContext()).resolves.toEqual({
      mode: 'cloud',
      userEmail: 'user@example.com',
    });
  });
});
