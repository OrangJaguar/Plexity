/**
 * Soft meta prior: parse admin-uploaded tier lines into mild score boosts.
 * Never hard-filters; unknown names are reported, not fatal.
 */

/**
 * @param {string} text
 * @param {Array<{ id: number, name: string }>} catalog
 * @returns {{ byId: Map<number, number>, skipped: string[], accepted: number }}
 */
export function parseMetaTierText(text, catalog) {
  const byName = new Map();
  for (const b of catalog || []) {
    byName.set(String(b.name || '').trim().toLowerCase(), Number(b.id));
  }

  /** @type {Map<number, number>} */
  const byId = new Map();
  /** @type {string[]} */
  const skipped = [];
  let accepted = 0;

  const raw = String(text || '').trim();
  if (!raw) return { byId, skipped, accepted };

  // Try JSON object / array first
  if (raw.startsWith('{') || raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      const entries = Array.isArray(parsed)
        ? parsed.map((row) => {
          if (Array.isArray(row)) return { name: row[0], id: row[0], score: row[1] };
          return row;
        })
        : Object.entries(parsed).map(([k, v]) => ({ name: k, id: k, score: v }));

      for (const row of entries) {
        const score = clampTierScore(row?.score ?? row?.tier ?? row?.value);
        if (score == null) {
          skipped.push(String(row?.name || row?.id || '?'));
          continue;
        }
        const id = resolveId(row, byName);
        if (id == null) {
          skipped.push(String(row?.name || row?.id || '?'));
          continue;
        }
        byId.set(id, score);
        accepted += 1;
      }
      return { byId, skipped, accepted };
    } catch {
      skipped.push('(invalid JSON — falling back to line parse)');
    }
  }

  for (const line of raw.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/[,\t=|]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) {
      skipped.push(trimmed);
      continue;
    }
    const score = clampTierScore(parts[parts.length - 1]);
    const nameOrId = parts.slice(0, -1).join(' ');
    if (score == null) {
      skipped.push(trimmed);
      continue;
    }
    const id = resolveId({ name: nameOrId, id: nameOrId }, byName);
    if (id == null) {
      skipped.push(nameOrId);
      continue;
    }
    byId.set(id, score);
    accepted += 1;
  }

  return { byId, skipped, accepted };
}

function resolveId(row, byName) {
  const rawId = row?.id ?? row?.brawler_id ?? row?.brawlerId;
  if (rawId != null && /^\d+$/.test(String(rawId).trim())) {
    return Number(rawId);
  }
  const name = String(row?.name || rawId || '').trim().toLowerCase();
  if (!name) return null;
  return byName.get(name) ?? null;
}

/** Accept 0–100 or letter tiers → 0–1 internal weight later */
function clampTierScore(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, value));
  }
  const s = String(value).trim().toUpperCase();
  const letter = {
    S: 95,
    'S+': 100,
    A: 80,
    'A+': 88,
    B: 65,
    'B+': 72,
    C: 50,
    D: 35,
    F: 15,
  };
  if (letter[s] != null) return letter[s];
  const n = Number(s);
  if (Number.isFinite(n)) return Math.max(0, Math.min(100, n));
  return null;
}

/**
 * Mild draft boost from meta prior (0–12).
 * @param {number | undefined} tierScore 0–100
 */
export function metaBoostFromTier(tierScore) {
  if (tierScore == null || !Number.isFinite(Number(tierScore))) return 0;
  return Math.round((Number(tierScore) / 100) * 12 * 10) / 10;
}

/**
 * Serialize map of id→score for storage (name-keyed when possible).
 * @param {Map<number, number>} byId
 * @param {Array<{ id: number, name: string }>} catalog
 */
export function tiersMapToPayload(byId, catalog) {
  const byCatalog = new Map((catalog || []).map((c) => [Number(c.id), c.name]));
  /** @type {Record<string, number>} */
  const out = {};
  for (const [id, score] of byId.entries()) {
    const name = byCatalog.get(Number(id));
    out[name || String(id)] = score;
  }
  return out;
}
