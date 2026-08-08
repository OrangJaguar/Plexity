/**
 * Strict English voice intents for the Brawl draft board (no LLM).
 */

import { DRAFT_MODES } from '@/lib/tools/brawl/draft-roles';

/** @param {string} s */
export function normalizeVoiceText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} a
 * @param {string} b
 */
function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cur = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = cur;
    }
  }
  return row[b.length];
}

/**
 * @param {Array<{ id: number, name: string }>} catalog
 * @param {string} spoken
 * @returns {{ id: number, name: string, score: number } | null}
 */
export function matchBrawlerName(catalog, spoken) {
  const q = normalizeVoiceText(spoken);
  if (!q || q.length < 2) return null;

  let best = null;
  for (const b of catalog || []) {
    const name = normalizeVoiceText(b.name);
    if (!name) continue;
    if (name === q || name.includes(q) || q.includes(name)) {
      const score = name === q ? 100 : 80 - Math.abs(name.length - q.length);
      if (!best || score > best.score) best = { id: b.id, name: b.name, score };
      continue;
    }
    const dist = editDistance(name, q);
    const maxLen = Math.max(name.length, q.length);
    if (dist <= 2 || (maxLen >= 6 && dist / maxLen <= 0.28)) {
      const score = 70 - dist * 8;
      if (!best || score > best.score) best = { id: b.id, name: b.name, score };
    }
  }
  return best && best.score >= 55 ? best : null;
}

/**
 * @param {string} spoken
 * @returns {string | null} mode id
 */
export function matchModeName(spoken) {
  const q = normalizeVoiceText(spoken);
  for (const m of DRAFT_MODES) {
    const label = normalizeVoiceText(m.label);
    if (q.includes(label) || label.includes(q)) return m.id;
  }
  const aliases = {
    gem: 'gemGrab',
    gems: 'gemGrab',
    ball: 'brawlBall',
    'brawl ball': 'brawlBall',
    ko: 'knockout',
    knockout: 'knockout',
    zone: 'hotZone',
    'hot zone': 'hotZone',
    heist: 'heist',
    bounty: 'bounty',
    wipeout: 'wipeout',
  };
  for (const [key, id] of Object.entries(aliases)) {
    if (q.includes(key)) return id;
  }
  return null;
}

/**
 * Parse one utterance into a draft intent.
 * @param {string} transcript
 * @param {{
 *   catalog: Array<{ id: number, name: string }>,
 *   nicknames?: string[],
 * }} ctx
 * @returns {{
 *   type: string,
 *   label: string,
 *   brawlerId?: number,
 *   brawlerName?: string,
 *   modeId?: string,
 *   mapName?: string,
 *   nickname?: string,
 * } | null}
 */
export function parseBrawlVoiceIntent(transcript, ctx) {
  const raw = String(transcript || '').trim();
  const text = normalizeVoiceText(raw);
  if (!text) return null;

  if (/^(undo|go back|cancel last)/.test(text)) {
    return { type: 'undo', label: 'Undo last' };
  }

  const modeMatch = text.match(/^(?:set )?mode(?: to)? (.+)$/);
  if (modeMatch) {
    const modeId = matchModeName(modeMatch[1]);
    if (modeId) {
      const label = DRAFT_MODES.find((m) => m.id === modeId)?.label || modeId;
      return { type: 'set_mode', modeId, label: `Mode: ${label}` };
    }
  }

  const mapMatch = text.match(/^(?:set )?map(?: to)? (.+)$/);
  if (mapMatch) {
    const mapName = mapMatch[1].replace(/\b(please|thanks)\b/g, '').trim();
    if (mapName.length >= 2) {
      return { type: 'set_map', mapName: mapName.replace(/\b\w/g, (c) => c.toUpperCase()), label: `Map: ${mapName}` };
    }
  }

  // Multi-ban dump: "ban shelly piper edgar" / "bans: shelly, colt, and piper"
  const multiBanMatch = text.match(/^bans?\s*[:=]?\s+(.+)$/);
  if (multiBanMatch) {
    const rest = multiBanMatch[1].replace(/^dump\s+/, '');
    const tokens = rest
      .split(/,|\band\b/i)
      .flatMap((chunk) => chunk.trim().split(/\s+/))
      .map((t) => t.trim())
      .filter((t) => t && !/^(dump|please|thanks)$/i.test(t));

    // If single token, fall through to single-ban below (also matched here)
    const hits = [];
    const seen = new Set();
    // Prefer splitting as whole names first when commas used
    const commaParts = rest.split(/,|\band\b/i).map((s) => s.trim()).filter(Boolean);
    const tryParts = commaParts.length > 1 ? commaParts : null;

    if (tryParts) {
      for (const part of tryParts) {
        const hit = matchBrawlerName(ctx.catalog, part);
        if (hit && !seen.has(hit.id)) {
          seen.add(hit.id);
          hits.push(hit);
        }
      }
    } else {
      // Space-separated dump: match one token at a time, then adjacent pairs (Mr. P, El Primo).
      for (const token of tokens) {
        const hit = matchBrawlerName(ctx.catalog, token);
        if (hit && hit.score >= 78 && !seen.has(hit.id)) {
          seen.add(hit.id);
          hits.push(hit);
        }
      }
      for (let i = 0; i < tokens.length - 1; i += 1) {
        const pair = `${tokens[i]} ${tokens[i + 1]}`;
        const hit = matchBrawlerName(ctx.catalog, pair);
        if (hit && hit.score >= 78 && !seen.has(hit.id)) {
          seen.add(hit.id);
          hits.push(hit);
        }
      }
    }

    if (hits.length > 1) {
      return {
        type: 'ban_many',
        brawlerIds: hits.map((h) => h.id),
        brawlerNames: hits.map((h) => h.name),
        label: `Ban ${hits.map((h) => h.name).join(', ')}`,
      };
    }
    if (hits.length === 1) {
      return { type: 'ban', brawlerId: hits[0].id, brawlerName: hits[0].name, label: `Ban ${hits[0].name}` };
    }
  }

  const banMatch = text.match(/^(?:ban|banned)\s+(.+)$/);
  if (banMatch) {
    const hit = matchBrawlerName(ctx.catalog, banMatch[1]);
    if (hit) return { type: 'ban', brawlerId: hit.id, brawlerName: hit.name, label: `Ban ${hit.name}` };
  }

  const unbanMatch = text.match(/^(?:unban|remove ban)\s+(.+)$/);
  if (unbanMatch) {
    const hit = matchBrawlerName(ctx.catalog, unbanMatch[1]);
    if (hit) return { type: 'unban', brawlerId: hit.id, brawlerName: hit.name, label: `Unban ${hit.name}` };
  }

  const enemyMatch = text.match(/^(?:enemy|they|opp(?:onent)?s?)\s+(?:picked?|pick|took|has|locked)\s+(.+)$/)
    || text.match(/^(?:enemy pick|they pick|they took|opp pick)\s+(.+)$/);
  if (enemyMatch) {
    const hit = matchBrawlerName(ctx.catalog, enemyMatch[1]);
    if (hit) return { type: 'enemy_pick', brawlerId: hit.id, brawlerName: hit.name, label: `Enemy ${hit.name}` };
  }

  const ourMatch = text.match(/^(?:we|our|us)\s+(?:picked?|pick|took|take|lock)\s+(.+)$/)
    || text.match(/^(?:pick|lock)\s+(.+)$/);
  if (ourMatch) {
    let rest = ourMatch[1];
    let nickname;
    const forMatch = rest.match(/^(.+?)\s+(?:for|to)\s+(.+)$/);
    if (forMatch) {
      rest = forMatch[1];
      nickname = forMatch[2].trim();
      const nickList = (ctx.nicknames || []).map((n) => normalizeVoiceText(n));
      const nickQ = normalizeVoiceText(nickname);
      const nickHit = (ctx.nicknames || []).find((_, i) => nickList[i] === nickQ || nickList[i]?.includes(nickQ));
      if (nickHit) nickname = nickHit;
    }
    const hit = matchBrawlerName(ctx.catalog, rest);
    if (hit) {
      return {
        type: 'our_pick',
        brawlerId: hit.id,
        brawlerName: hit.name,
        nickname,
        label: nickname ? `Pick ${hit.name} for ${nickname}` : `Pick ${hit.name}`,
      };
    }
  }

  // Bare brawler name → current seat (or ban if still in ban phase)
  const fillers = /^(uh+|um+|okay|ok|so|like|just|please|thanks)\s+/;
  let bareText = text;
  while (fillers.test(bareText)) bareText = bareText.replace(fillers, '');
  bareText = bareText.replace(/\s+(please|thanks)$/i, '').trim();
  const bare = matchBrawlerName(ctx.catalog, bareText);
  if (bare && bare.score >= 78 && bareText.length >= 2) {
    return {
      type: 'current_seat',
      brawlerId: bare.id,
      brawlerName: bare.name,
      label: bare.name,
    };
  }

  return null;
}

/** Short phrases shown near the mic for shotcallers. */
export const VOICE_CHEAT_SHEET = [
  'ban Shelly Piper Edgar',
  'we pick Piper',
  'enemy picked Colt',
  'set mode Knockout',
  'set map Hard Rock Mine',
  'undo',
];

