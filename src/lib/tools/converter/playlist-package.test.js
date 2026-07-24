import { describe, expect, it } from 'vitest';
import { classifyImportUrl, isDiscoveryProvider, isDeferredProvider } from '@/lib/tools/converter/url-import-classify.js';
import {
  filterDiscoveryItems,
  setAllSelected,
  validateSelection,
  renderPlaylistFilename,
  resolveArchivePathCollision,
  dedupeDiscoveryItems,
  formatPlaylistNumber,
} from '@/lib/tools/converter/playlist-selection.js';
import {
  validatePackageCreateRequest,
  normalizeRemotePackageOptions,
} from '@/lib/tools/converter/remote-package-model.js';
import {
  canTransitionRemoteState,
  evaluatePackageSizePolicy,
  REMOTE_ERROR_CODES,
  REMOTE_QUOTAS,
} from '@/lib/tools/converter/remote-job-schema.js';
import { parseUrlListText, URL_IMPORT_LIMITS } from '@/lib/tools/converter/url-import-parse.js';

describe('plan 6 classify', () => {
  it('defers playlists when allowPlaylist is false', () => {
    const c = classifyImportUrl('https://www.youtube.com/playlist?list=PLabcdefghijklmnop');
    expect(c.provider).toBe('playlist-deferred');
    expect(isDeferredProvider(c.provider)).toBe(true);
  });

  it('accepts playlists and channels when allowPlaylist is true', () => {
    const pl = classifyImportUrl('https://www.youtube.com/playlist?list=PLabcdefghijklmnop', {
      allowPlaylist: true,
    });
    expect(pl.provider).toBe('youtube-playlist');
    expect(isDiscoveryProvider(pl.provider)).toBe(true);

    const ch = classifyImportUrl('https://www.youtube.com/@somechannel', { allowPlaylist: true });
    expect(ch.provider).toBe('youtube-channel');
  });

  it('classifies feeds when allowFeed is true', () => {
    const deferred = classifyImportUrl('https://example.com/podcast/feed.xml');
    expect(deferred.provider).toBe('playlist-deferred');
    const feed = classifyImportUrl('https://example.com/podcast/feed.xml', { allowFeed: true });
    expect(feed.provider).toBe('rss-feed');
  });
});

describe('plan 6 selection', () => {
  const items = [
    { itemId: '1', providerItemId: 'a', redactedTitle: 'Alpha', durationBucket: 'lt10m', selected: false },
    { itemId: '2', providerItemId: 'b', redactedTitle: 'Beta', durationBucket: 'lt10m', selected: false },
    { itemId: '3', providerItemId: 'a', redactedTitle: 'Alpha copy', durationBucket: 'lt10m', selected: false },
  ];

  it('filters, selects, and dedupes', () => {
    expect(filterDiscoveryItems(items, 'alp')).toHaveLength(2);
    expect(dedupeDiscoveryItems(items)).toHaveLength(2);
    const all = setAllSelected(items, true);
    expect(all.every((i) => i.selected)).toBe(true);
  });

  it('enforces selection empty and max 50', () => {
    expect(validateSelection(items).code).toBe(REMOTE_ERROR_CODES.SELECTION_EMPTY);
    const many = Array.from({ length: 51 }, (_, i) => ({
      itemId: String(i),
      providerItemId: String(i),
      redactedTitle: `Item ${i}`,
      durationBucket: 'unknown',
      selected: true,
    }));
    expect(validateSelection(many).code).toBe(REMOTE_ERROR_CODES.QUOTA_EXCEEDED);
  });

  it('renders numbered filenames and collisions', () => {
    expect(formatPlaylistNumber(7)).toBe('007');
    expect(renderPlaylistFilename({ index: 1, title: 'Hello', extension: 'mp4' })).toContain('001');
    const used = new Set();
    const a = resolveArchivePathCollision('a.mp4', used);
    const b = resolveArchivePathCollision('a.mp4', used);
    expect(a).toBe('a.mp4');
    expect(b).not.toBe(a);
  });
});

describe('plan 6 package model', () => {
  it('requires ready outputs unless subset opted in', () => {
    expect(validatePackageCreateRequest({
      readyCount: 1,
      selectedCount: 3,
      options: { readySubsetOnly: false },
    }).code).toBe(REMOTE_ERROR_CODES.PACKAGE_INCOMPLETE);

    expect(validatePackageCreateRequest({
      readyCount: 1,
      selectedCount: 3,
      options: { readySubsetOnly: true },
    }).ok).toBe(true);
  });

  it('warns and hard-caps package sizes', () => {
    expect(evaluatePackageSizePolicy(REMOTE_QUOTAS.packageWarnMobileBytes, 'mobile').warning).toBe('PACKAGE_SIZE_WARNING');
    expect(evaluatePackageSizePolicy(REMOTE_QUOTAS.packageHardCapBytes + 1).ok).toBe(false);
    expect(normalizeRemotePackageOptions({ includeMetadata: false }).includeMetadata).toBe(false);
    expect(normalizeRemotePackageOptions({ includeAiTranscripts: true }).includeAiTranscripts).toBe(true);
    expect(normalizeRemotePackageOptions({ includeAiOcr: true }).includeAiOcr).toBe(true);
  });
});

describe('plan 6 state machine', () => {
  it('allows discovering and packaging transitions', () => {
    expect(canTransitionRemoteState('discovering', 'discovered')).toBe(true);
    expect(canTransitionRemoteState('queued', 'paused')).toBe(true);
    expect(canTransitionRemoteState('paused', 'queued')).toBe(true);
    expect(canTransitionRemoteState('processing', 'packaging')).toBe(true);
    expect(canTransitionRemoteState('packaging', 'ready')).toBe(true);
  });
});

describe('plan 6 large list parse', () => {
  it('supports discoverable disposition and raised parse caps', () => {
    expect(URL_IMPORT_LIMITS.maxLargeListParse).toBe(500);
    const result = parseUrlListText('https://www.youtube.com/playlist?list=PLabcdefghijklmnop\n', {
      allowPlaylist: true,
    });
    expect(result.discoverable).toHaveLength(1);
  });
});
