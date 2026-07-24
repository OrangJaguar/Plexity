import { describe, expect, it } from 'vitest';
import {
  artifactKeyForJob,
  createMemoryArtifactStore,
  normalizeQuotaError,
} from '@/lib/tools/converter/artifact-store.js';

describe('artifact-store (memory)', () => {
  it('put/get/delete round trip', async () => {
    const store = createMemoryArtifactStore();
    const key = artifactKeyForJob('job1', 'attempt1');
    const blob = new Blob(['hello'], { type: 'text/plain' });

    await store.put(key, blob);
    const got = await store.get(key);
    expect(got).not.toBeNull();
    expect(await got.text()).toBe('hello');

    await store.delete(key);
    expect(await store.get(key)).toBeNull();
  });

  it('clearJob removes all keys for job', async () => {
    const store = createMemoryArtifactStore();
    await store.put(artifactKeyForJob('job1', 'a1', 'out'), new Blob(['a']));
    await store.put(artifactKeyForJob('job1', 'a2', 'out'), new Blob(['b']));
    await store.put(artifactKeyForJob('job2', 'a1', 'out'), new Blob(['c']));

    await store.clearJob('job1');
    expect(await store.get(artifactKeyForJob('job1', 'a1', 'out'))).toBeNull();
    expect(await store.get(artifactKeyForJob('job2', 'a1', 'out'))).not.toBeNull();
  });

  it('clearAbandoned removes inactive keys', async () => {
    const store = createMemoryArtifactStore();
    const active = artifactKeyForJob('job1', 'a1');
    const stale = artifactKeyForJob('job2', 'a1');
    await store.put(active, new Blob(['keep']));
    await store.put(stale, new Blob(['drop']));

    await store.clearAbandoned([active]);
    expect(await store.get(active)).not.toBeNull();
    expect(await store.get(stale)).toBeNull();
  });

  it('normalizes quota errors', () => {
    const err = { name: 'QuotaExceededError', message: 'full' };
    expect(normalizeQuotaError(err).code).toBe('QUOTA_EXCEEDED');
  });
});
