import {
  BRAWLER_TAG_SEEDS,
  COUNTER_TAG_EDGES,
  MODE_A1_PREFER,
  MODE_ROLE_BUDGETS,
  SYNERGY_TAG_PAIRS,
} from '@/lib/tools/brawl/draft-roles';

/**
 * @param {Array<{ id: number, name: string }>} catalog
 */
export function buildTagIndex(catalog) {
  const map = new Map();
  for (const b of catalog || []) {
    const key = String(b.name || '').trim().toLowerCase();
    const tags = BRAWLER_TAG_SEEDS[key] || ['flex'];
    map.set(Number(b.id), tags);
  }
  return map;
}

function tagsFor(tagIndex, brawlerId) {
  return tagIndex.get(Number(brawlerId)) || ['flex'];
}

function missingRoles(modeId, pickedIds, tagIndex) {
  const budget = [...(MODE_ROLE_BUDGETS[modeId] || MODE_ROLE_BUDGETS.unknown)];
  const covered = new Set();
  for (const id of pickedIds) {
    for (const t of tagsFor(tagIndex, id)) covered.add(t);
  }
  return budget.filter((r) => !covered.has(r));
}

function uniqReasons(list) {
  const out = [];
  const seen = new Set();
  for (const r of list) {
    const key = String(r || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out.slice(0, 4);
}

/**
 * Step-aware draft scoring (research doctrine).
 * Pockets/avoids are mild preferences — map/mode/step/counters dominate.
 *
 * @typedef {object} DraftScoreInput
 * @property {number} brawlerId
 * @property {number} fit
 * @property {boolean} isAvoid
 * @property {boolean} isPocket
 * @property {string} modeId
 * @property {number[]} ourPickIds
 * @property {number[]} enemyPickIds
 * @property {Map<number, string[]>} tagIndex
 * @property {number} [metaBoost]
 * @property {string} [laneSeat] e.g. A1, B3
 * @property {number} [accountPower] 0–1 from trophies/elo prior
 * @property {string} [mapName]
 */

/** Soft map-name texture (bush/open/wall) so maps reshuffle tops within a mode. */
export function mapTextureMod(mapName, tags = []) {
  const n = String(mapName || '').toLowerCase();
  if (!n) return 0;
  let mod = 0;
  if (/bush|hide|grass|sneaky|cavern|grotto/.test(n)) {
    if (tags.includes('assassin') || tags.includes('thrower')) mod += 5;
    if (tags.includes('sniper') && !tags.includes('control')) mod -= 2;
  }
  if (/open|bridge|canal|highway|plaza|field|beach/.test(n)) {
    if (tags.includes('sniper') || tags.includes('anti-tank')) mod += 5;
    if (tags.includes('assassin')) mod -= 2;
  }
  if (/wall|box|safe|fort|castle|warehouse/.test(n)) {
    if (tags.includes('thrower') || tags.includes('control')) mod += 4;
  }
  // Tiny stable salt so two different maps aren't identical order
  let salt = 0;
  for (let i = 0; i < n.length; i += 1) salt = (salt + n.charCodeAt(i) * (i + 1)) % 7;
  if (tags.includes('flex') || tags.includes('damage')) mod += (salt % 3) - 1;
  return mod;
}

/**
 * @param {DraftScoreInput} input
 */
export function scoreDraftCandidate(input) {
  const {
    brawlerId,
    fit = 50,
    isAvoid = false,
    isPocket = false,
    modeId = 'unknown',
    ourPickIds = [],
    enemyPickIds = [],
    tagIndex,
    metaBoost = 0,
    laneSeat = '',
    accountPower = 0.5,
    mapName = '',
  } = input;

  const tags = tagsFor(tagIndex, brawlerId);
  const reasons = [];

  // Soft avoid — never hard-kill the list
  const avoidPenalty = isAvoid ? 18 : 0;
  if (isAvoid) reasons.push('avoid');

  const missing = missingRoles(modeId, ourPickIds, tagIndex);
  const fills = tags.some((t) => missing.includes(t));
  const roleFit = fills ? 28 : tags.includes('flex') ? 8 : 3;
  if (fills) reasons.push('fills role');

  let synergy = 0;
  for (const ally of ourPickIds) {
    const allyTags = tagsFor(tagIndex, ally);
    for (const [a, b] of SYNERGY_TAG_PAIRS) {
      if ((tags.includes(a) && allyTags.includes(b)) || (tags.includes(b) && allyTags.includes(a))) {
        synergy += 10;
      }
    }
  }
  synergy = Math.min(synergy, 30);
  if (synergy > 0) reasons.push('synergy');

  let counter = 0;
  let multiCounterHits = 0;
  for (const enemy of enemyPickIds) {
    const enemyTags = tagsFor(tagIndex, enemy);
    let hit = false;
    for (const [us, them] of COUNTER_TAG_EDGES) {
      if (tags.includes(us) && enemyTags.includes(them)) {
        counter += 14;
        hit = true;
      }
    }
    if (hit) multiCounterHits += 1;
  }
  counter = Math.min(counter, 48);
  if (counter > 0) reasons.push(multiCounterHits >= 2 ? 'multi-counter' : 'counter');

  // Personal skill — tempered (was dominating via pockets)
  const fitPart = (Number(fit) || 0) * 0.2;
  const pocketBoost = isPocket ? 4 : 0;
  if (isPocket) reasons.push('pocket');

  const softMeta = Math.max(0, Math.min(10, Number(metaBoost) || 0));
  if (softMeta >= 4) reasons.push('meta');

  // Step doctrine
  let stepMod = 0;
  const seat = String(laneSeat || '');
  const isAssassin = tags.includes('assassin');
  const isSniper = tags.includes('sniper');
  const isTank = tags.includes('tank');
  const isControl = tags.includes('control');
  const isThrower = tags.includes('thrower');
  const isSupport = tags.includes('support');
  const isAntiTank = tags.includes('anti-tank');
  const isDamage = tags.includes('damage');

  const a1Prefer = MODE_A1_PREFER[modeId] || MODE_A1_PREFER.unknown;
  const modeA1Hit = tags.some((t) => a1Prefer.includes(t));

  if (seat === 'A1') {
    if (modeA1Hit) stepMod += 16;
    if (isControl || (isTank && !isAssassin) || tags.includes('flex')) stepMod += 8;
    if (isAssassin || (isSniper && !isControl && !modeA1Hit) || isThrower) {
      stepMod -= 24;
      reasons.push('risky A1');
    } else if (stepMod > 0) {
      reasons.push('safe A1');
    }
  } else if (seat === 'B1' || seat === 'B2') {
    if (counter > 0) stepMod += 10;
    if (synergy > 0 && seat === 'B2') {
      stepMod += 12;
      reasons.push('synergy lock');
    }
    if (fills) stepMod += 6;
  } else if (seat === 'A2' || seat === 'A3') {
    if (fills) stepMod += 10;
    if (seat === 'A3' && (isControl || isTank || isSupport || isAntiTank)) {
      stepMod += 10;
      reasons.push('peel A3');
    }
    if (seat === 'A3' && isAssassin && !counter) stepMod -= 10;
  } else if (seat === 'B3') {
    stepMod += multiCounterHits >= 2 ? 28 : multiCounterHits === 1 ? 16 : -8;
    if (multiCounterHits >= 2) reasons.push('B3 punish');
    else if (multiCounterHits === 0) reasons.push('weak B3');
    if (isAssassin && enemyPickIds.some((id) => tagsFor(tagIndex, id).includes('sniper'))) {
      stepMod += 8;
      reasons.push('dive snipers');
    }
    if (isPocket && multiCounterHits === 0) stepMod -= 10;
  }

  // Lower-account players: prefer simpler/tankier; high accounts: allow assassin/sniper more
  const power = Math.max(0, Math.min(1, Number(accountPower) || 0.5));
  let skillMod = 0;
  if (power < 0.4) {
    if (isTank || isControl || isSupport) skillMod += 7;
    if (isAssassin || isThrower) skillMod -= 9;
  } else if (power > 0.7) {
    if (isAssassin || isSniper || isAntiTank) skillMod += 5;
  }

  // Mild mode affinity beyond A1 (helps mode-to-mode reshuffle)
  let modeMod = 0;
  const budget = MODE_ROLE_BUDGETS[modeId] || MODE_ROLE_BUDGETS.unknown;
  if (tags.some((t) => budget.includes(t))) modeMod += 6;
  if (modeId === 'brawlBall' && (isTank || isAssassin || isDamage)) modeMod += 4;
  if (modeId === 'knockout' && (isSniper || isControl) && !isAssassin) modeMod += 4;
  if (modeId === 'heist' && (isDamage || isAssassin || isAntiTank)) modeMod += 4;

  const mapMod = mapTextureMod(mapName, tags);
  if (mapMod >= 4) reasons.push('map fit');

  const score = roleFit + synergy + counter + fitPart + pocketBoost + softMeta
    + stepMod + skillMod + modeMod + mapMod - avoidPenalty;

  return {
    score: Math.round(score * 10) / 10,
    reasons: uniqReasons(reasons),
  };
}

/** Map ranked Elo → 0–1 skill prior for draft bias. */
export function eloToAccountPower(rankedElo) {
  const elo = Number(rankedElo);
  if (!Number.isFinite(elo) || elo <= 0) return 0.5;
  // Mythic~ roughly mid; Masters/Legend higher
  if (elo < 500) return 0.28;
  if (elo < 700) return 0.42;
  if (elo < 900) return 0.58;
  if (elo < 1100) return 0.72;
  return 0.85;
}

export function legalP11Ids(rosterRows, bannedOrPicked) {
  return (rosterRows || [])
    .filter((r) => Number(r.power) >= 11)
    .map((r) => Number(r.brawler_id))
    .filter((id) => Number.isFinite(id) && !bannedOrPicked.has(id));
}

/** High-fit owned but below P11 — show greyed. */
export function upgradeCandidateIds(rosterRows, fitById, bannedOrPicked, minFit = 72) {
  return (rosterRows || [])
    .filter((r) => Number(r.power) < 11 && Number(r.power) >= 1)
    .map((r) => Number(r.brawler_id))
    .filter((id) => {
      if (!Number.isFinite(id) || bannedOrPicked.has(id)) return false;
      const f = fitById.get(id);
      return Number(f?.fit ?? 0) >= minFit;
    });
}

export function createEmptyDraftState() {
  return {
    gameMode: '',
    mapName: '',
    coinFlip: /** @type {'' | 'us' | 'enemy'} */ (''),
    partyLeaderUserId: '',
    soloSeatIndex: 0,
    bans: [],
    ourPicks: [],
    enemyPicks: [],
    pickOrder: [],
    phase: 'setup',
    readySwap: null,
    updatedAt: Date.now(),
  };
}
