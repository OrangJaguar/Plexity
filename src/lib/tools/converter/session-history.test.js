import { describe, expect, it } from 'vitest';
import { createSessionHistory } from '@/lib/tools/converter/session-history.js';

describe('session-history', () => {
  it('adds and lists entries in order', () => {
    const history = createSessionHistory();
    history.add({ name: 'a.png', category: 'image', operationId: 'png-to-webp', status: 'completed' });
    history.add({ name: 'b.wav', category: 'audio', operationId: 'wav-to-mp3', status: 'completed' });

    const entries = history.list();
    expect(entries).toHaveLength(2);
    expect(entries[0].token).toBe('file-1');
    expect(entries[1].token).toBe('file-2');
    expect(Object.isFrozen(entries)).toBe(true);
  });

  it('never retains the full filename, only the extension', () => {
    const history = createSessionHistory();
    history.add({ name: 'my-private-diary-scan.png' });
    const [entry] = history.list();
    expect(entry.extension).toBe('png');
    expect(JSON.stringify(entry)).not.toContain('my-private-diary-scan');
  });

  it('clears entries', () => {
    const history = createSessionHistory();
    history.add({ name: 'a.png' });
    history.clear();
    expect(history.list()).toHaveLength(0);
  });

  it('caps the number of retained entries at maxEntries', () => {
    const history = createSessionHistory({ maxEntries: 2 });
    history.add({ name: 'a.png' });
    history.add({ name: 'b.png' });
    history.add({ name: 'c.png' });
    const entries = history.list();
    expect(entries).toHaveLength(2);
    expect(entries[0].token).toBe('file-2');
    expect(entries[1].token).toBe('file-3');
  });

  it('disposes and stops accepting new entries', () => {
    const history = createSessionHistory();
    history.add({ name: 'a.png' });
    history.dispose();
    expect(history.list()).toHaveLength(0);
    expect(history.add({ name: 'b.png' })).toBeNull();
    expect(history.list()).toHaveLength(0);
  });
});
