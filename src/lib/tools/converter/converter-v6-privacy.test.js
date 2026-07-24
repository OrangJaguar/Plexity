import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('Plan 6 privacy and kill-switch regressions', () => {
  it('documents feed and playlist kill switches', () => {
    const docs = readFileSync(path.join(root, 'docs/admin-converter-playlists-packages.md'), 'utf8');
    expect(docs).toMatch(/ENABLE_FEED_CONNECTOR/);
    expect(docs).toMatch(/converter\.playlist\.import/);
    expect(docs).toMatch(/converter\.package\.create/);
    expect(docs).toMatch(/ENABLE_YOUTUBE_CONNECTOR/);
    expect(docs.toLowerCase()).toMatch(/rollback/);
  });

  it('playlist UI never brands as YouTube Downloader and discloses temporary servers', () => {
    const source = readFileSync(
      path.join(root, 'src/components/tools/converter/ConverterPlaylistDiscoveryPanel.jsx'),
      'utf8',
    );
    expect(source).not.toMatch(/YouTube Downloader/i);
    expect(source.toLowerCase()).toMatch(/temporary/);
    expect(source.toLowerCase()).toMatch(/admin only/);
  });

  it('package hook does not use local OPFS package builders', () => {
    const source = readFileSync(
      path.join(root, 'src/hooks/useAdminConverterPackage.js'),
      'utf8',
    );
    expect(source).not.toMatch(/buildConverterPackage\(/);
    expect(source).not.toMatch(/createOutputZip\(/);
    expect(source).not.toMatch(/navigator\.storage\.getDirectory/);
    expect(source).toContain('converterPackageCreate');
  });

  it('media service includes discovery and package workers', () => {
    expect(existsSync(path.join(root, 'services/converter-media/src/workers/discovery-worker.js'))).toBe(true);
    expect(existsSync(path.join(root, 'services/converter-media/src/workers/package-worker.js'))).toBe(true);
    expect(existsSync(path.join(root, 'services/converter-media/src/connectors/youtube-playlist.js'))).toBe(true);
    expect(existsSync(path.join(root, 'services/converter-media/src/connectors/rss-feed.js'))).toBe(true);
    const readme = readFileSync(path.join(root, 'services/converter-media/README.md'), 'utf8');
    expect(readme).toMatch(/ENABLE_FEED_CONNECTOR|playlist|package/i);
  });
});
