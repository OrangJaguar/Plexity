import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const entryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'entry.ts');

describe('toolsMarketData entry (deploy contract)', () => {
  const source = readFileSync(entryPath, 'utf8');

  it('is self-contained — no sibling _shared imports', () => {
    expect(source).not.toMatch(/from\s+["']\.\.\/_shared\//);
  });

  it('does not gate Yahoo data behind auth.me()', () => {
    expect(source).not.toContain('createClientFromRequest');
    expect(source).not.toContain('auth.me()');
  });

  it('exposes yahoo action handler', () => {
    expect(source).toContain('action === "yahoo"');
    expect(source).toContain('Deno.serve');
  });
});
