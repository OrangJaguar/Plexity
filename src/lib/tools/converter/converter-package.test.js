import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import {
  buildConverterPackage,
  buildConverterPackageStaged,
  evaluatePackageAdmission,
  PACKAGE_LIMITS,
} from '@/lib/tools/converter/converter-package.js';
import { DEFAULT_PACKAGE_OPTIONS } from '@/lib/tools/converter/converter-package-model.js';
import { detectDeviceProfile } from '@/lib/tools/converter/converter-limits.js';

describe('converter-package', () => {
  it('builds zip with safe file names', async () => {
    const { blob, fileName } = await buildConverterPackage([
      { name: 'bad<>name.png', bytes: new Uint8Array([1, 2, 3]) },
      { name: 'readme.txt', bytes: new TextEncoder().encode('hello') },
    ], { archiveName: 'outputs.zip' });

    expect(blob.type).toBe('application/zip');
    expect(fileName).toBe('outputs.zip');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('rejects too many files', async () => {
    const entries = Array.from({ length: 41 }, (_, i) => ({
      name: `f${i}.txt`,
      bytes: new TextEncoder().encode('x'),
    }));
    await expect(buildConverterPackage(entries)).rejects.toMatchObject({ code: 'TOO_MANY_FILES' });
  });

  it('writes large packages to OPFS when an artifact store is provided', async () => {
    /** @type {Map<string, Blob>} */
    const blobs = new Map();
    const store = {
      kind: 'memory',
      async put(key, blob) { blobs.set(key, blob); },
      async get(key) { return blobs.get(key) ?? null; },
      async delete(key) { blobs.delete(key); },
      async clearJob() {},
      async clearAbandoned() {},
      async dispose() { blobs.clear(); },
    };

    const big = new Uint8Array(PACKAGE_LIMITS.opfsThresholdBytes + 16).fill(7);
    const { blob, fileName, artifactKey } = await buildConverterPackage(
      [{ name: 'large.bin', bytes: big }],
      {
        archiveName: 'large.zip',
        artifactStore: store,
        preferOpfs: true,
        artifactKey: 'package/test.zip',
      },
    );

    expect(fileName).toBe('large.zip');
    expect(artifactKey).toBe('package/test.zip');
    expect(blobs.has('package/test.zip')).toBe(true);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('falls back to memory when OPFS put fails', async () => {
    const store = {
      kind: 'opfs',
      async put() { throw new Error('quota'); },
      async get() { return null; },
      async delete() {},
      async clearJob() {},
      async clearAbandoned() {},
      async dispose() {},
    };
    const { blob, artifactKey } = await buildConverterPackage(
      [{ name: 'a.txt', bytes: new TextEncoder().encode('hi') }],
      { artifactStore: store, preferOpfs: true, artifactKey: 'package/fail.zip' },
    );
    expect(artifactKey).toBeNull();
    expect(blob.type).toBe('application/zip');
  });

  it('cancels packaging when the abort signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(buildConverterPackage(
      [{ name: 'a.txt', bytes: new TextEncoder().encode('hi') }],
      { signal: controller.signal },
    )).rejects.toMatchObject({ code: 'PACKAGE_CANCELLED' });
  });

  it('renames colliding sanitized file names instead of overwriting entries', async () => {
    const { blob } = await buildConverterPackage([
      { name: 'photo<1>.png', bytes: new TextEncoder().encode('first') },
      { name: 'photo?1?.png', bytes: new TextEncoder().encode('second') },
    ], { archiveName: 'outputs.zip' });

    const buffer = new Uint8Array(await blob.arrayBuffer());
    const unzipped = unzipSync(buffer);
    const names = Object.keys(unzipped).sort();

    expect(names).toEqual(['photo_1_ (2).png', 'photo_1_.png']);
    expect(new TextDecoder().decode(unzipped['photo_1_.png'])).toBe('first');
    expect(new TextDecoder().decode(unzipped['photo_1_ (2).png'])).toBe('second');
  });

  it('preserves relative paths when preserveStructure is enabled', async () => {
    const { blob } = await buildConverterPackage([
      {
        name: 'a.txt',
        relativePath: 'project/src/a.txt',
        bytes: new TextEncoder().encode('alpha'),
      },
      {
        name: 'b.txt',
        relativePath: 'project/docs/b.txt',
        bytes: new TextEncoder().encode('beta'),
      },
    ], { preserveStructure: true, archiveName: 'bundle.zip' });

    const unzipped = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(unzipped).sort()).toEqual(['project/docs/b.txt', 'project/src/a.txt']);
  });

  it('includes checksum sidecar and report when requested', async () => {
    const { blob } = await buildConverterPackage([
      { name: 'a.txt', bytes: new TextEncoder().encode('hello') },
    ], {
      includeChecksumSidecar: true,
      includeReport: true,
      compressionPolicy: 'deflate',
    });

    const unzipped = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const names = Object.keys(unzipped);
    expect(names.some((name) => name.endsWith('checksums.sha256.txt'))).toBe(true);
    expect(names).toContain('package-report.json');
  });

  it('builds staged packages for many entries', async () => {
    const entries = Array.from({ length: 12 }, (_, i) => ({
      name: `f${i}.txt`,
      bytes: new TextEncoder().encode(`file-${i}`),
    }));
    const { blob, fileName } = await buildConverterPackageStaged(entries, { archiveName: 'staged.zip' });
    expect(fileName).toBe('staged.zip');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('exposes default package options from the model', () => {
    expect(DEFAULT_PACKAGE_OPTIONS.flatten).toBe(true);
    expect(DEFAULT_PACKAGE_OPTIONS.compressionPolicy).toBe('auto');
  });

  describe('evaluatePackageAdmission', () => {
    const desktop = detectDeviceProfile({ isMobile: false });

    it('rejects empty entry lists', () => {
      expect(evaluatePackageAdmission([], desktop)).toEqual({
        admitted: false,
        code: 'EMPTY',
        message: 'No completed outputs to package',
      });
    });

    it('rejects when the entry count exceeds the file limit', () => {
      const entries = Array.from({ length: 41 }, () => ({ size: 10 }));
      const result = evaluatePackageAdmission(entries, desktop);
      expect(result.admitted).toBe(false);
      expect(result.code).toBe('TOO_MANY_FILES');
    });

    it('admits a normal set of completed jobs and sums their sizes', () => {
      const entries = [{ output: { size: 100 } }, { size: 200 }, { bytes: new Uint8Array(50) }];
      const result = evaluatePackageAdmission(entries, desktop);
      expect(result.admitted).toBe(true);
      expect(result.totalBytes).toBe(350);
    });

    it('rejects when the aggregate size exceeds the device budget', () => {
      const mobile = detectDeviceProfile({ isMobile: true });
      const entries = [{ size: 90 * 1024 * 1024 }]; // over the 80MB mobile package budget
      const result = evaluatePackageAdmission(entries, mobile);
      expect(result.admitted).toBe(false);
      expect(result.code).toBe('AGGREGATE_TOO_LARGE');
    });
  });
});
