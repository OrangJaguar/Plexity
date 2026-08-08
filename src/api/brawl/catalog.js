/**
 * Live catalogs: official Brawl Stars list (in-game truth) + BrawlAPI art.
 */
import { fetchOfficialBrawlers } from '@/api/brawl/client';

const BRAWLAPI_BASE = 'https://api.brawlapi.com/v1';
const CATALOG_TTL_MS = 30 * 60 * 1000;

/** @type {{ at: number, brawlers: object[] | null, maps: object[] | null, merged: object[] | null }} */
let cache = { at: 0, brawlers: null, maps: null, merged: null };

async function fetchJson(path) {
  const res = await fetch(`${BRAWLAPI_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`BrawlAPI ${path} failed (${res.status})`);
  }
  return res.json();
}

function listFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function sortByName(a, b) {
  return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
}

/** @returns {Promise<object[]>} */
export async function fetchBrawlApiBrawlers({ force = false } = {}) {
  const fresh = Date.now() - cache.at < CATALOG_TTL_MS;
  if (!force && cache.brawlers && fresh) return cache.brawlers;
  const payload = await fetchJson('/brawlers');
  const list = listFromPayload(payload);
  cache = { ...cache, at: Date.now(), brawlers: list };
  return list;
}

/** @returns {Promise<object[]>} */
export async function fetchBrawlApiMaps({ force = false } = {}) {
  const fresh = Date.now() - cache.at < CATALOG_TTL_MS;
  if (!force && cache.maps && fresh) return cache.maps;
  const payload = await fetchJson('/maps');
  const list = listFromPayload(payload);
  cache = { ...cache, at: Date.now(), maps: list };
  return list;
}

/**
 * @param {object} brawler
 * @returns {{
 *   id: number,
 *   name: string,
 *   imageUrl: string | null,
 *   rarity: string | null,
 *   gadgets: Array<{ id: number, name: string }>,
 *   starPowers: Array<{ id: number, name: string }>,
 * }}
 */
export function normalizeCatalogBrawler(brawler) {
  const id = Number(brawler?.id);
  const name = String(brawler?.name || '').trim();
  const imageUrl = brawler?.imageUrl2
    || brawler?.imageUrl
    || brawler?.imageUrlFull
    || null;
  const rarity = brawler?.rarity?.name || brawler?.rarity || null;
  const gadgets = (Array.isArray(brawler?.gadgets) ? brawler.gadgets : [])
    .map((g) => ({ id: Number(g?.id), name: String(g?.name || '').trim() }))
    .filter((g) => Number.isFinite(g.id) && g.name);
  const starPowers = (Array.isArray(brawler?.starPowers) ? brawler.starPowers : Array.isArray(brawler?.star_powers) ? brawler.star_powers : [])
    .map((g) => ({ id: Number(g?.id), name: String(g?.name || '').trim() }))
    .filter((g) => Number.isFinite(g.id) && g.name);
  return {
    id,
    name,
    imageUrl: typeof imageUrl === 'string' ? imageUrl : null,
    rarity: rarity ? String(rarity) : null,
    gadgets,
    starPowers,
  };
}

/**
 * In-game catalog: official IDs/names, BrawlAPI portraits + gadget/SP names when available.
 * Sorted A–Z. Excludes unreleased/removed names that only exist on BrawlAPI.
 * @returns {Promise<Array<object>>}
 */
export async function loadBrawlCatalog({ force = false } = {}) {
  const fresh = Date.now() - cache.at < CATALOG_TTL_MS;
  if (!force && cache.merged?.length) return cache.merged;

  /** @type {Map<number, object>} */
  const artById = new Map();
  try {
    const apiList = await fetchBrawlApiBrawlers({ force });
    for (const row of apiList) {
      const n = normalizeCatalogBrawler(row);
      if (Number.isFinite(n.id)) artById.set(n.id, n);
    }
  } catch {
    /* portraits optional */
  }

  let officialItems = [];
  try {
    const official = await fetchOfficialBrawlers();
    officialItems = listFromPayload(official);
  } catch {
    // Fallback: BrawlAPI only, drop obvious non-released if flagged
    officialItems = [...artById.values()].map((n) => ({ id: n.id, name: n.name }));
  }

  const merged = officialItems
    .map((row) => {
      const id = Number(row?.id);
      const art = artById.get(id);
      const name = String(row?.name || art?.name || '').trim();
      if (!Number.isFinite(id) || !name) return null;
      return {
        id,
        name,
        imageUrl: art?.imageUrl || null,
        rarity: art?.rarity || null,
        gadgets: art?.gadgets || [],
        starPowers: art?.starPowers || [],
      };
    })
    .filter(Boolean)
    .sort(sortByName);

  cache = { ...cache, at: Date.now(), merged };
  return merged;
}

/** Clear in-memory catalog cache (tests). */
export function clearBrawlCatalogCache() {
  cache = { at: 0, brawlers: null, maps: null, merged: null };
}
