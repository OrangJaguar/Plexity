import { describe, expect, it, vi } from 'vitest';
import { createConverterResourceRegistry } from '@/lib/tools/converter/converter-resource-registry.js';

describe('converter-resource-registry', () => {
  it('tracks and disposes object URLs idempotently', () => {
    const registry = createConverterResourceRegistry();
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    registry.registerObjectUrl('j1', 'a1', 'blob:1');
    registry.registerObjectUrl('j1', 'a1', 'blob:2');

    registry.disposeAttempt('j1', 'a1');
    registry.disposeAttempt('j1', 'a1');

    expect(revoke).toHaveBeenCalled();
    revoke.mockRestore();
  });

  it('terminates workers and aborts controllers on dispose', () => {
    const registry = createConverterResourceRegistry();
    const terminate = vi.fn();
    const abort = vi.fn();
    const worker = /** @type {Worker} */ ({ terminate });
    const controller = { abort };

    registry.registerWorker('j1', 'a1', worker);
    registry.registerAbortController('j1', 'a1', controller);
    registry.disposeAttempt('j1', 'a1');

    expect(terminate).toHaveBeenCalled();
    expect(abort).toHaveBeenCalled();
  });

  it('releaseWorkersAndControllers without revoking object URLs', () => {
    const registry = createConverterResourceRegistry();
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const terminate = vi.fn();
    const abort = vi.fn();

    registry.registerObjectUrl('j1', 'a1', 'blob:keep');
    registry.registerWorker('j1', 'a1', /** @type {Worker} */ ({ terminate }));
    registry.registerAbortController('j1', 'a1', { abort });

    registry.releaseWorkersAndControllers('j1', 'a1');

    expect(terminate).toHaveBeenCalled();
    expect(abort).toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
    expect(registry.snapshot('j1', 'a1').objectUrls).toContain('blob:keep');
    revoke.mockRestore();
  });

  it('replaces object URL revokes previous once', () => {
    const registry = createConverterResourceRegistry();
    const revoked = [];
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url) => revoked.push(url));

    registry.registerObjectUrl('j1', 'a1', 'blob:old');
    registry.registerObjectUrl('j1', 'a1', 'blob:new');

    expect(revoked).toContain('blob:old');
    expect(revoked).not.toContain('blob:new');
    vi.restoreAllMocks();
  });
});
