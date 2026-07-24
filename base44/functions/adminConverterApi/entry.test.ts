import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const entryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'entry.ts');

describe('adminConverterApi entry (deploy contract)', () => {
  const source = readFileSync(entryPath, 'utf8');

  it('is self-contained — no sibling _shared imports', () => {
    expect(source).not.toMatch(/from\s+["']\.\.\/_shared\//);
  });

  it('requires authentication and exact admin role before privileged work', () => {
    expect(source).toContain('createClientFromRequest');
    expect(source).toContain('auth.me()');
    expect(source).toContain('user.role !== "admin"');
    const authIdx = source.indexOf('user.role !== "admin"');
    const createIdx = source.indexOf('converter.job.create');
    expect(authIdx).toBeGreaterThan(-1);
    expect(createIdx).toBeGreaterThan(-1);
  });

  it('uses an explicit action allowlist including validate/create/download/callback', () => {
    expect(source).toContain('ALLOWED_ACTIONS');
    for (const action of [
      'converter.url.validate',
      'converter.job.create',
      'converter.job.list',
      'converter.job.get',
      'converter.job.cancel',
      'converter.job.retry',
      'converter.job.download',
      'converter.discovery.create',
      'converter.discovery.items',
      'converter.batch.confirm',
      'converter.batch.pause',
      'converter.batch.retryFailed',
      'converter.package.create',
      'converter.package.download',
      'converter.worker.callback',
    ]) {
      expect(source).toContain(action);
    }
  });

  it('signs control-service requests with timestamped HMAC', () => {
    expect(source).toContain('x-plexity-timestamp');
    expect(source).toContain('x-plexity-nonce');
    expect(source).toContain('x-plexity-signature');
    expect(source).toContain('hmacSign');
  });

  it('authenticates worker callbacks via HMAC before applying updates', () => {
    const callbackIdx = source.indexOf('converter.worker.callback');
    const hmacIdx = source.indexOf('hmacVerify');
    expect(callbackIdx).toBeGreaterThan(-1);
    expect(hmacIdx).toBeGreaterThan(callbackIdx);
  });

  it('never writes raw URLs into audit detail templates', () => {
    expect(source).toContain('writeAudit');
    expect(source).not.toMatch(/detail:\s*`[^`]*\$\{url\}/);
    expect(source).not.toMatch(/detail:.*rawUrl/);
  });

  it('supports kill switches for new jobs and youtube', () => {
    expect(source).toContain('ACCEPT_NEW_JOBS');
    expect(source).toContain('ENABLE_YOUTUBE_CONNECTOR');
  });

  it('sanitizes errors without stack traces', () => {
    expect(source).toContain('Unable to complete converter admin request');
    expect(source).not.toContain('.stack');
  });
});
