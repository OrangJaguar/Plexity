import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  GUEST_KEYS,
  clearGuestStorage,
  readGuestArray,
  readGuestJson,
  writeGuestArray,
  writeGuestJson,
  guestUpsertBy,
  guestDeleteBy,
} from '@/lib/storage/guest-store';

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
    key: (index) => Array.from(map.keys())[index] ?? null,
    get length() { return map.size; },
    clear: () => { map.clear(); },
  };
}

describe('guest-store', () => {
  beforeEach(() => {
    globalThis.window = { localStorage: createMemoryStorage() };
  });

  afterEach(() => {
    clearGuestStorage();
    delete globalThis.window;
  });

  it('reads and writes JSON values', () => {
    writeGuestJson(GUEST_KEYS.preferences, { themeDark: true });
    expect(readGuestJson(GUEST_KEYS.preferences, null)).toEqual({ themeDark: true });
    expect(readGuestJson('missing.key', 'fallback')).toBe('fallback');
  });

  it('manages guest arrays with upsert and delete', () => {
    writeGuestArray(GUEST_KEYS.tasks, [{ taskId: 'a', title: 'One' }]);
    let rows = readGuestArray(GUEST_KEYS.tasks);
    rows = guestUpsertBy(rows, 'taskId', 'a', { taskId: 'a', title: 'Updated' });
    rows = [...rows, { taskId: 'b', title: 'Two' }];
    writeGuestArray(GUEST_KEYS.tasks, rows);
    expect(readGuestArray(GUEST_KEYS.tasks)).toHaveLength(2);
    expect(readGuestArray(GUEST_KEYS.tasks)[0].title).toBe('Updated');

    rows = guestDeleteBy(readGuestArray(GUEST_KEYS.tasks), 'taskId', 'a');
    writeGuestArray(GUEST_KEYS.tasks, rows);
    expect(readGuestArray(GUEST_KEYS.tasks)).toEqual([{ taskId: 'b', title: 'Two' }]);
  });

  it('clears all guest-prefixed keys', () => {
    writeGuestJson(GUEST_KEYS.tasks, []);
    writeGuestJson(GUEST_KEYS.calendar, []);
    window.localStorage.setItem('plexity.other', 'keep');
    clearGuestStorage();
    expect(window.localStorage.getItem(GUEST_KEYS.tasks)).toBeNull();
    expect(window.localStorage.getItem(GUEST_KEYS.calendar)).toBeNull();
    expect(window.localStorage.getItem('plexity.other')).toBe('keep');
  });
});
