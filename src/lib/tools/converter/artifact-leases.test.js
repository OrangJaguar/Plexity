import { describe, expect, it } from 'vitest';
import { createArtifactLeaseManager, safeDelete } from '@/lib/tools/converter/artifact-leases.js';
import { artifactKeyForJob, createMemoryArtifactStore } from '@/lib/tools/converter/artifact-store.js';

describe('artifact-leases', () => {
  it('is ref-counted: only unleased after every acquire is released', () => {
    const leases = createArtifactLeaseManager();
    const key = artifactKeyForJob('job1', 'a1');

    leases.acquire(key);
    leases.acquire(key);
    expect(leases.isLeased(key)).toBe(true);

    leases.release(key);
    expect(leases.isLeased(key)).toBe(true);

    leases.release(key);
    expect(leases.isLeased(key)).toBe(false);
  });

  it('release on an unleased key is a no-op and never goes negative', () => {
    const leases = createArtifactLeaseManager();
    const key = artifactKeyForJob('job1', 'a1');

    leases.release(key);
    expect(leases.isLeased(key)).toBe(false);

    leases.acquire(key);
    leases.release(key);
    leases.release(key);
    expect(leases.isLeased(key)).toBe(false);
  });

  it('disposeAll clears every lease', () => {
    const leases = createArtifactLeaseManager();
    leases.acquire('a');
    leases.acquire('b');
    leases.disposeAll();
    expect(leases.isLeased('a')).toBe(false);
    expect(leases.isLeased('b')).toBe(false);
  });

  it('safeDelete skips deletion while a key is leased', async () => {
    const store = createMemoryArtifactStore();
    const leases = createArtifactLeaseManager();
    const key = artifactKeyForJob('job1', 'a1');
    await store.put(key, new Blob(['keep']));

    leases.acquire(key);
    const deleted = await safeDelete(store, leases, key);

    expect(deleted).toBe(false);
    expect(await store.get(key)).not.toBeNull();
  });

  it('safeDelete removes the key once it is no longer leased', async () => {
    const store = createMemoryArtifactStore();
    const leases = createArtifactLeaseManager();
    const key = artifactKeyForJob('job1', 'a1');
    await store.put(key, new Blob(['drop']));

    leases.acquire(key);
    leases.release(key);
    const deleted = await safeDelete(store, leases, key);

    expect(deleted).toBe(true);
    expect(await store.get(key)).toBeNull();
  });
});
