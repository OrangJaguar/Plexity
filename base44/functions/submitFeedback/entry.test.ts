import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const entryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'entry.ts');

describe('submitFeedback entry (deploy contract)', () => {
  const source = readFileSync(entryPath, 'utf8');

  it('is self-contained — no sibling _shared imports', () => {
    expect(source).not.toMatch(/from\s+["']\.\.\/_shared\//);
  });

  it('requires authentication', () => {
    expect(source).toContain('createClientFromRequest');
    expect(source).toContain('auth.me()');
  });
});
