/**
 * Remote server package model (Plan 6) — separate from local browser ZIP jobs.
 */

import { evaluatePackageSizePolicy, REMOTE_ERROR_CODES, REMOTE_QUOTAS } from './remote-job-schema.js';

/**
 * @typedef {{
 *   includeThumbnails: boolean,
 *   includeSubtitles: boolean,
 *   includeMetadata: boolean,
 *   includeAiTranscripts: boolean,
 *   includeAiOcr: boolean,
 *   includeAiAltText: boolean,
 *   readySubsetOnly: boolean,
 * }} RemotePackageOptions
 */

export const DEFAULT_REMOTE_PACKAGE_OPTIONS = Object.freeze({
  includeThumbnails: false,
  includeSubtitles: false,
  includeMetadata: true,
  includeAiTranscripts: false,
  includeAiOcr: false,
  includeAiAltText: false,
  readySubsetOnly: false,
});

/**
 * @param {Partial<RemotePackageOptions>} [opts]
 * @returns {RemotePackageOptions}
 */
export function normalizeRemotePackageOptions(opts = {}) {
  return {
    includeThumbnails: Boolean(opts.includeThumbnails),
    includeSubtitles: Boolean(opts.includeSubtitles),
    includeMetadata: opts.includeMetadata !== false,
    includeAiTranscripts: Boolean(opts.includeAiTranscripts),
    includeAiOcr: Boolean(opts.includeAiOcr),
    includeAiAltText: Boolean(opts.includeAiAltText),
    readySubsetOnly: Boolean(opts.readySubsetOnly),
  };
}
/**
 * @param {{
 *   readyCount: number,
 *   selectedCount: number,
 *   estimatedBytes?: number,
 *   device?: 'desktop' | 'mobile',
 *   options?: Partial<RemotePackageOptions>,
 * }} input
 */
export function validatePackageCreateRequest(input) {
  const options = normalizeRemotePackageOptions(input.options);
  const ready = Number(input.readyCount) || 0;
  const selected = Number(input.selectedCount) || 0;

  if (selected <= 0) {
    return { ok: false, code: REMOTE_ERROR_CODES.SELECTION_EMPTY, warning: null, options };
  }

  if (!options.readySubsetOnly && ready < selected) {
    return { ok: false, code: REMOTE_ERROR_CODES.PACKAGE_INCOMPLETE, warning: null, options };
  }

  if (options.readySubsetOnly && ready <= 0) {
    return { ok: false, code: REMOTE_ERROR_CODES.PACKAGE_INCOMPLETE, warning: null, options };
  }

  const size = evaluatePackageSizePolicy(input.estimatedBytes ?? 0, input.device || 'desktop');
  if (!size.ok) {
    return { ok: false, code: size.code, warning: null, options };
  }

  return { ok: true, code: null, warning: size.warning, options };
}

export { REMOTE_QUOTAS as PACKAGE_QUOTAS };
