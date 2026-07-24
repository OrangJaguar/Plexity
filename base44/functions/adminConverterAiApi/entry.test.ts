import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const entryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'entry.ts');

describe('adminConverterAiApi entry (deploy contract)', () => {
  const source = readFileSync(entryPath, 'utf8');

  it('is self-contained — no sibling _shared imports', () => {
    expect(source).not.toMatch(/from\s+["']\.\.\/_shared\//);
  });

  it('requires authentication and exact admin role before provider work', () => {
    expect(source).toContain('createClientFromRequest');
    expect(source).toContain('auth.me()');
    expect(source).toContain('user.role !== "admin"');
    const authIdx = source.indexOf('user.role !== "admin"');
    const assistIdx = source.indexOf('converter.ai.assist.plan');
    expect(authIdx).toBeGreaterThan(-1);
    expect(assistIdx).toBeGreaterThan(-1);
  });

  it('uses an explicit action allowlist including assist/ocr/transcribe/callback', () => {
    expect(source).toContain('ALLOWED_ACTIONS');
    for (const action of [
      'session',
      'converter.ai.assist.plan',
      'converter.ai.assist.summary',
      'converter.ai.assist.naming',
      'converter.ai.assist.compress',
      'converter.ai.ocr.run',
      'converter.ai.ocr.get',
      'converter.ai.transcribe.run',
      'converter.ai.transcribe.get',
      'converter.ai.subtitle.generate',
      'converter.ai.job.cancel',
      'converter.ai.usage.summary',
      'converter.ai.worker.callback',
    ]) {
      expect(source).toContain(action);
    }
  });

  it('supports AI kill switches', () => {
    expect(source).toContain('ENABLE_AI_PROVIDER');
    expect(source).toContain('ACCEPT_NEW_AI_JOBS');
  });

  it('authenticates worker callbacks via HMAC', () => {
    expect(source).toContain('hmacVerify');
    expect(source).toContain('converter.ai.worker.callback');
  });

  it('sanitizes errors without stack traces', () => {
    expect(source).toContain('Unable to complete converter AI request');
    expect(source).not.toContain('.stack');
  });

  it('never writes raw prompts into audit detail templates', () => {
    expect(source).toContain('writeAudit');
    expect(source).not.toMatch(/detail:\s*`[^`]*\$\{nl\}/);
    expect(source).not.toMatch(/detail:.*requestText/);
  });
});
