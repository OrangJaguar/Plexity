import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  STORAGE_KEYS,
  LEGACY_PINNED_TOOL_IDS_KEY,
  migrateLegacyPinnedToolIdsKey,
} from '@/lib/storage/storage-keys';

describe('migrateLegacyPinnedToolIdsKey', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: /** @type {Record<string, string>} */ ({}),
      getItem(key) {
        return key in this.store ? this.store[key] : null;
      },
      setItem(key, value) {
        this.store[key] = String(value);
      },
      removeItem(key) {
        delete this.store[key];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('migrates legacy undefined key into pinnedToolIds once', () => {
    localStorage.setItem(LEGACY_PINNED_TOOL_IDS_KEY, JSON.stringify(['converter', 'tasks']));
    migrateLegacyPinnedToolIdsKey();

    expect(localStorage.getItem(STORAGE_KEYS.pinnedToolIds)).toBe(JSON.stringify(['converter', 'tasks']));
    expect(localStorage.getItem(LEGACY_PINNED_TOOL_IDS_KEY)).toBeNull();
  });

  it('does not overwrite existing pinnedToolIds cache', () => {
    localStorage.setItem(LEGACY_PINNED_TOOL_IDS_KEY, JSON.stringify(['calendar']));
    localStorage.setItem(STORAGE_KEYS.pinnedToolIds, JSON.stringify(['tasks']));
    migrateLegacyPinnedToolIdsKey();

    expect(localStorage.getItem(STORAGE_KEYS.pinnedToolIds)).toBe(JSON.stringify(['tasks']));
    expect(localStorage.getItem(LEGACY_PINNED_TOOL_IDS_KEY)).toBeNull();
  });
});
