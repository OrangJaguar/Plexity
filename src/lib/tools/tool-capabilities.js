import { TOOL_REGISTRY } from '@/lib/tools/registry';

/**
 * Capability keys are namespaced, action-oriented strings.
 * Example future keys: 'image.ai.generate', 'converter.url.import'
 *
 * Capabilities are additive extensions only — do not relabel every public
 * feature as a capability. Empty admin deltas mean public === admin UI.
 */

/** @typedef {Record<string, boolean>} ToolCapabilityMap */

/**
 * Public capability sets keyed by tool ID (or 'catalog' / 'settings').
 * Intentionally empty for Plan 1 — capabilities are for future optional features.
 * @type {Readonly<Record<string, Readonly<ToolCapabilityMap>>>}
 */
export const PUBLIC_TOOL_CAPABILITIES = Object.freeze(
  Object.fromEntries([
    ...TOOL_REGISTRY.map((t) => [t.id, Object.freeze({})]),
    ['catalog', Object.freeze({})],
    ['settings', Object.freeze({})],
  ]),
);

/**
 * Admin deltas keyed by tool ID.
 * Converter Plans 5–7: URL import, playlists, packages, and AI capabilities.
 * @type {Readonly<Record<string, Readonly<ToolCapabilityMap>>>}
 */
export const ADMIN_TOOL_CAPABILITY_DELTAS = Object.freeze(
  Object.fromEntries([
    ...TOOL_REGISTRY.map((t) => [
      t.id,
      Object.freeze(
        t.id === 'converter'
          ? {
            'converter.url.import': true,
            'converter.playlist.import': true,
            'converter.package.create': true,
            'converter.ai.assist': true,
            'converter.ai.ocr': true,
            'converter.ai.transcribe': true,
          }
          : {},
      ),
    ]),
    ['catalog', Object.freeze({})],
    ['settings', Object.freeze({})],
  ]),
);

/** Admin-only capability key for Authorized URL Import (Plan 5). */
export const CONVERTER_URL_IMPORT_CAPABILITY = 'converter.url.import';

/** Admin-only playlist/feed discovery (Plan 6). */
export const CONVERTER_PLAYLIST_IMPORT_CAPABILITY = 'converter.playlist.import';

/** Admin-only server ZIP packages (Plan 6). */
export const CONVERTER_PACKAGE_CREATE_CAPABILITY = 'converter.package.create';

/** Admin-only NL assist / summaries / naming (Plan 7). */
export const CONVERTER_AI_ASSIST_CAPABILITY = 'converter.ai.assist';

/** Admin-only OCR / tables / alt-text (Plan 7). */
export const CONVERTER_AI_OCR_CAPABILITY = 'converter.ai.ocr';

/** Admin-only transcription / subtitles (Plan 7). */
export const CONVERTER_AI_TRANSCRIBE_CAPABILITY = 'converter.ai.transcribe';

/**
 * Extension slot names for future admin UI injections.
 * Implementations must be dynamically loaded only when a capability is present —
 * never statically imported into the public bundle.
 * @type {ReadonlyArray<string>}
 */
export const TOOL_EXTENSION_SLOTS = Object.freeze([
  'toolbarActions',
  'headerActions',
  'sidebarPanel',
  'inputSources',
  'exportFormats',
]);

/**
 * Resolve capabilities for a tool on a given surface.
 * Fail-closed: unknown tools return an empty frozen map.
 *
 * @param {string} toolId
 * @param {'public' | 'admin'} [surface]
 * @returns {Readonly<ToolCapabilityMap>}
 */
export function resolveToolCapabilities(toolId, surface = 'public') {
  const publicCaps = PUBLIC_TOOL_CAPABILITIES[toolId] ?? Object.freeze({});
  if (surface !== 'admin') {
    return Object.freeze({ ...publicCaps });
  }
  const delta = ADMIN_TOOL_CAPABILITY_DELTAS[toolId] ?? Object.freeze({});
  return Object.freeze({ ...publicCaps, ...delta });
}

/**
 * @param {Readonly<ToolCapabilityMap>} capabilities
 * @param {string} key
 */
export function hasToolCapability(capabilities, key) {
  if (!capabilities || typeof key !== 'string' || !key) return false;
  return capabilities[key] === true;
}
