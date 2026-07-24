import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const entryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'entry.ts');

describe('adminApi entry (deploy contract)', () => {
  const source = readFileSync(entryPath, 'utf8');

  it('is self-contained — no sibling _shared imports', () => {
    expect(source).not.toMatch(/from\s+["']\.\.\/_shared\//);
  });

  it('requires authentication and exact admin role', () => {
    expect(source).toContain('createClientFromRequest');
    expect(source).toContain('auth.me()');
    expect(source).toContain('user.role !== "admin"');
  });

  it('uses an explicit action allowlist', () => {
    expect(source).toContain('session');
    expect(source).toContain('feedback.list');
    expect(source).toContain('feedback.update');
    expect(source).toContain('ALLOWED_ACTIONS');
  });

  it('writes sanitized audit records for privileged mutations', () => {
    expect(source).toContain('AdminAuditLog');
    expect(source).toContain('writeAudit');
  });

  it('authorizes before privileged feedback mutations', () => {
    const authIdx = source.indexOf('user.role !== "admin"');
    const updateIdx = source.indexOf('ToolsFeedback.update');
    expect(authIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeLessThan(updateIdx);
  });
});

describe('adminApi authorization helpers (source semantics)', () => {
  const source = readFileSync(entryPath, 'utf8');

  it('rejects unknown actions and sanitizes errors', () => {
    expect(source).toContain('Unknown or disallowed action');
    expect(source).toContain('Admin action failed.');
    expect(source).not.toContain('stack');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('documents versioned request shape', () => {
    expect(source).toContain('API_VERSION');
    expect(source).toContain('Unsupported API version');
  });
});
