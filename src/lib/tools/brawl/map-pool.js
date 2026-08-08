/**
 * Map helpers + admin curated ranked pool per mode.
 */

import { DRAFT_MODES } from '@/lib/tools/brawl/draft-roles';

/** @param {string} modeId */
export function modeLabelForId(modeId) {
  return DRAFT_MODES.find((m) => m.id === modeId)?.label || '';
}

/** @param {object} map */
export function mapGameModeName(map) {
  return String(map?.gameMode?.name || map?.gameMode || '').trim();
}

/**
 * @param {object[]} maps
 * @param {string} modeId
 * @param {{ includeDisabled?: boolean }} [opts]
 */
export function mapsForGameMode(maps, modeId, opts = {}) {
  const label = modeLabelForId(modeId).toLowerCase();
  if (!label) return [];
  const includeDisabled = Boolean(opts.includeDisabled);

  return (maps || [])
    .filter((m) => {
      const gm = mapGameModeName(m).toLowerCase();
      if (!gm || gm !== label) return false;
      if (!includeDisabled && m.disabled) return false;
      return Boolean(m.name);
    })
    .map((m) => ({
      name: String(m.name),
      id: m.id != null ? Number(m.id) : undefined,
      disabled: Boolean(m.disabled),
      imageUrl: m.imageUrl || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/**
 * Ranked tool dropdown source.
 * Curated `rankedPoolByMode[modeId]` is authoritative when present (including empty = no maps).
 * Only fall back to noisy API actives if admin has never curated any mode.
 *
 * @param {object[]} apiMaps
 * @param {string} modeId
 * @param {Record<string, string[]> | string[] | null | undefined} rankedPoolByModeOrLegacy
 */
export function resolveMapChoices(apiMaps, modeId, rankedPoolByModeOrLegacy) {
  /** @type {string[]} */
  let curated = [];
  let hasAnyCuratedMode = false;

  if (Array.isArray(rankedPoolByModeOrLegacy)) {
    curated = rankedPoolByModeOrLegacy;
    hasAnyCuratedMode = curated.length > 0;
  } else if (rankedPoolByModeOrLegacy && typeof rankedPoolByModeOrLegacy === 'object') {
    const values = Object.values(rankedPoolByModeOrLegacy);
    hasAnyCuratedMode = values.some((v) => Array.isArray(v) && v.length > 0);
    curated = Array.isArray(rankedPoolByModeOrLegacy[modeId])
      ? rankedPoolByModeOrLegacy[modeId]
      : [];
  }

  curated = curated.map((n) => String(n).trim()).filter(Boolean);

  // Admin curated at least one mode → never dump full API list for empty modes
  if (hasAnyCuratedMode || curated.length) {
    const active = mapsForGameMode(apiMaps, modeId, { includeDisabled: true });
    const byLower = new Map(active.map((m) => [m.name.toLowerCase(), m]));
    return curated.map((name) => {
      const hit = byLower.get(name.toLowerCase());
      return hit || { name, id: undefined, disabled: false, imageUrl: null };
    });
  }

  return mapsForGameMode(apiMaps, modeId, { includeDisabled: false });
}

/**
 * @param {Record<string, string[]> | undefined} byMode
 * @param {string[]} legacyFlat
 */
export function normalizeRankedPoolByMode(byMode, legacyFlat = []) {
  /** @type {Record<string, string[]>} */
  const out = {};
  for (const m of DRAFT_MODES) {
    const fromObj = Array.isArray(byMode?.[m.id]) ? byMode[m.id] : null;
    out[m.id] = (fromObj || []).map((n) => String(n).trim()).filter(Boolean);
  }
  // Legacy flat list: keep as ungamed hints only if modes empty — attach to all for migration? Better leave modes empty and show legacy in admin separately.
  if (legacyFlat.length && DRAFT_MODES.every((m) => !out[m.id].length)) {
    // Don't auto-scatter flat names across modes — admin re-picks per mode.
  }
  return out;
}
