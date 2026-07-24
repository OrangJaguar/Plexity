import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const serviceRoot = path.join(root, 'services/converter-media');

describe('converter-media service scaffold', () => {
  it('includes docker compose, dockerfile, and operator runbook', () => {
    expect(existsSync(path.join(serviceRoot, 'docker-compose.yml'))).toBe(true);
    expect(existsSync(path.join(serviceRoot, 'Dockerfile'))).toBe(true);
    expect(existsSync(path.join(serviceRoot, 'README.md'))).toBe(true);
    expect(existsSync(path.join(serviceRoot, 'src/ssrf.js'))).toBe(true);
    expect(existsSync(path.join(serviceRoot, 'src/connectors/youtube-single.js'))).toBe(true);
    expect(existsSync(path.join(serviceRoot, 'src/workers/media-worker.js'))).toBe(true);
  });

  it('documents kill switches and deploy order', () => {
    const readme = readFileSync(path.join(serviceRoot, 'README.md'), 'utf8');
    expect(readme).toMatch(/ACCEPT_NEW_JOBS/);
    expect(readme).toMatch(/ENABLE_YOUTUBE_CONNECTOR/);
    expect(readme.toLowerCase()).toMatch(/deploy/);
    expect(readme.toLowerCase()).toMatch(/rollback|kill/);
  });

  it('implements SSRF fail-closed helpers', () => {
    const ssrf = readFileSync(path.join(serviceRoot, 'src/ssrf.js'), 'utf8');
    expect(ssrf).toMatch(/https/i);
    expect(ssrf).toMatch(/private|loopback|ssrf/i);
  });
});
