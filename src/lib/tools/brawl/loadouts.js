/**
 * Loadout hints for Ranked draft (gadget / star power / gears).
 * Seeds are coaching defaults — not eternal meta. Ownership warns, does not hard-block.
 */

import { BRAWLER_TAG_SEEDS } from '@/lib/tools/brawl/draft-roles';

/** @typedef {{ gadget?: string, starPower?: string, gears?: string[], note?: string }} LoadoutHint */

/**
 * Per-brawler preferred loadouts. Keys = lowercase catalog name.
 * `vsDive` used when enemy has assassin / dive pressure.
 * @type {Record<string, { default: LoadoutHint, vsDive?: LoadoutHint, vsTank?: LoadoutHint }>}
 */
export const LOADOUT_SEEDS = {
  piper: {
    default: { gadget: 'Homemade Recipe', starPower: 'Ambush', gears: ['Damage', 'Shield'] },
    vsDive: { gadget: 'Auto Aimer', starPower: 'Snappy Sniping', gears: ['Shield', 'Speed'], note: 'vs dive' },
  },
  belle: {
    default: { gadget: 'Nest Egg', starPower: 'Positive Feedback', gears: ['Damage', 'Shield'] },
    vsDive: { gadget: 'Peekaboo', starPower: 'Positive Feedback', gears: ['Shield', 'Speed'], note: 'vs dive' },
  },
  brock: {
    default: { gadget: 'Rocket Laces', starPower: 'Incendiary', gears: ['Damage', 'Shield'] },
    vsDive: { gadget: 'Rocket Laces', starPower: 'Incendiary', gears: ['Shield', 'Speed'], note: 'kite dive' },
  },
  nani: {
    default: { gadget: 'Warp Drive', starPower: 'Autofocus', gears: ['Damage', 'Shield'] },
    vsDive: { gadget: 'Return to Sender', starPower: 'Tempered Steel', gears: ['Shield', 'Speed'], note: 'vs dive' },
  },
  edgar: {
    default: { gadget: 'Let\'s Fly', starPower: 'Hard Landing', gears: ['Damage', 'Shield'] },
    vsTank: { gadget: 'Let\'s Fly', starPower: 'Hard Landing', gears: ['Damage', 'Health'], note: 'vs tanks' },
  },
  mortis: {
    default: { gadget: 'Survival Shovel', starPower: 'Creepy Harvest', gears: ['Damage', 'Shield'] },
  },
  bull: {
    default: { gadget: 'T-Bone Injector', starPower: 'Berserker', gears: ['Health', 'Shield'] },
  },
  gale: {
    default: { gadget: 'Twister', starPower: 'Blustery Blow', gears: ['Damage', 'Shield'] },
  },
  shelly: {
    default: { gadget: 'Clay Pigeons', starPower: 'Shell Shock', gears: ['Damage', 'Shield'] },
  },
  colt: {
    default: { gadget: 'Speedloader', starPower: 'Slick Boots', gears: ['Damage', 'Shield'] },
    vsTank: { gadget: 'Speedloader', starPower: 'Magnum Special', gears: ['Damage', 'Shield'], note: 'vs tanks' },
  },
  fang: {
    default: { gadget: 'Roundhouse Kick', starPower: 'Fresh Kicks', gears: ['Damage', 'Shield'] },
  },
  surge: {
    default: { gadget: 'Power Shield', starPower: 'To the Max!', gears: ['Damage', 'Shield'] },
  },
  gene: {
    default: { gadget: 'Vengeful Spirits', starPower: 'Magic Puffs', gears: ['Damage', 'Shield'] },
  },
  max: {
    default: { gadget: 'Phase Shifter', starPower: 'Super Charged', gears: ['Speed', 'Damage'] },
  },
  buzz: {
    default: { gadget: 'X-Ray Shades', starPower: 'Toxin', gears: ['Health', 'Shield'] },
  },
  kit: {
    default: { gadget: 'Cardboard Box', starPower: 'Power Hungry', gears: ['Damage', 'Shield'] },
  },
};

const BUSHY_MODES = new Set(['knockout', 'bounty', 'gemGrab', 'wipeout']);

/**
 * @param {string} modeId
 * @param {string[]} tags
 */
export function defaultGearsFor(modeId, tags = []) {
  const isTank = tags.includes('tank');
  const isAssassin = tags.includes('assassin');
  const isSniper = tags.includes('sniper');
  if (isTank) return ['Health', 'Shield'];
  if (isAssassin) return ['Damage', 'Speed'];
  if (isSniper && BUSHY_MODES.has(modeId)) return ['Damage', 'Vision'];
  if (BUSHY_MODES.has(modeId) && tags.includes('control')) return ['Damage', 'Vision'];
  return ['Damage', 'Shield'];
}

/**
 * @param {number[]} enemyPickIds
 * @param {Map<number, string[]>} tagIndex
 */
export function enemyPressure(enemyPickIds = [], tagIndex) {
  let dive = 0;
  let tanks = 0;
  for (const id of enemyPickIds) {
    const tags = tagIndex?.get(Number(id)) || [];
    if (tags.includes('assassin')) dive += 1;
    if (tags.includes('tank')) tanks += 1;
  }
  return { dive, tanks, hasDive: dive > 0, hasTanks: tanks > 0 };
}

/**
 * @param {object} catalogEntry — may include gadgets/starPowers from BrawlAPI
 * @param {object | null} rosterRow — brawl_roster_brawlers row
 * @param {string} wantName
 * @param {'gadget' | 'starPower'} kind
 */
export function ownershipForNamedPiece(catalogEntry, rosterRow, wantName, kind) {
  const want = String(wantName || '').trim().toLowerCase();
  if (!want) return { owned: null, label: wantName };

  const catalogList = kind === 'gadget'
    ? (catalogEntry?.gadgets || [])
    : (catalogEntry?.starPowers || catalogEntry?.star_powers || []);
  const catHit = catalogList.find((g) => String(g?.name || '').toLowerCase() === want);
  const wantId = catHit?.id != null ? Number(catHit.id) : null;

  const raw = rosterRow?.raw || {};
  const ownedList = kind === 'gadget'
    ? (Array.isArray(raw.gadgets) ? raw.gadgets : [])
    : (Array.isArray(raw.starPowers) ? raw.starPowers : Array.isArray(raw.star_powers) ? raw.star_powers : []);

  if (!rosterRow) {
    return { owned: null, label: wantName, id: wantId };
  }

  if (wantId != null && ownedList.some((g) => Number(g?.id) === wantId)) {
    return { owned: true, label: wantName, id: wantId };
  }
  if (ownedList.some((g) => String(g?.name || '').toLowerCase() === want)) {
    return { owned: true, label: wantName, id: wantId };
  }

  // Counts-only fallback: if they own 2 of kind, assume owned; if 0, missing; if 1, unknown
  const count = kind === 'gadget'
    ? Number(rosterRow.gadget_count)
    : Number(rosterRow.star_power_count);
  if (Number.isFinite(count)) {
    if (count >= 2) return { owned: true, label: wantName, id: wantId, assumed: true };
    if (count <= 0) return { owned: false, label: wantName, id: wantId };
  }
  return { owned: false, label: wantName, id: wantId };
}

/**
 * @param {{
 *   brawlerId: number,
 *   brawlerName?: string,
 *   modeId?: string,
 *   enemyPickIds?: number[],
 *   tagIndex?: Map<number, string[]>,
 *   catalogById?: Map<number, object>,
 *   rosterRow?: object | null,
 * }} input
 */
export function hintLoadout(input) {
  const {
    brawlerId,
    brawlerName = '',
    modeId = 'unknown',
    enemyPickIds = [],
    tagIndex,
    catalogById,
    rosterRow = null,
  } = input;

  const cat = catalogById?.get(Number(brawlerId)) || null;
  const name = String(brawlerName || cat?.name || '').trim();
  const key = name.toLowerCase();
  const tags = tagIndex?.get(Number(brawlerId))
    || BRAWLER_TAG_SEEDS[key]
    || ['flex'];

  const pressure = enemyPressure(enemyPickIds, tagIndex);
  const seed = LOADOUT_SEEDS[key];
  /** @type {LoadoutHint} */
  let pick = seed?.default || {
    gears: defaultGearsFor(modeId, tags),
  };

  if (seed?.vsDive && pressure.hasDive) pick = { ...seed.default, ...seed.vsDive };
  else if (seed?.vsTank && pressure.hasTanks) pick = { ...seed.default, ...seed.vsTank };
  else if (!seed) {
    pick = { gears: defaultGearsFor(modeId, tags) };
  }

  if (!pick.gears?.length) pick = { ...pick, gears: defaultGearsFor(modeId, tags) };

  const lines = [];
  const warnings = [];

  if (pick.gadget) {
    const own = ownershipForNamedPiece(cat, rosterRow, pick.gadget, 'gadget');
    lines.push(`Gadget: ${pick.gadget}`);
    if (own.owned === false) warnings.push('missing gadget');
  }
  if (pick.starPower) {
    const own = ownershipForNamedPiece(cat, rosterRow, pick.starPower, 'starPower');
    lines.push(`SP: ${pick.starPower}`);
    if (own.owned === false) warnings.push('missing SP');
  }
  if (pick.gears?.length) {
    lines.push(`Gears: ${pick.gears.join(' + ')}`);
    if (rosterRow && Number(rosterRow.gear_count) < 2) warnings.push('gears incomplete');
  }
  if (pick.note) lines.push(pick.note);

  // Generic tag-only fallback line when no seed gadget/SP
  if (!pick.gadget && !pick.starPower) {
    if (tags.includes('sniper') && pressure.hasDive) {
      lines.unshift('Prefer peel gadget / defensive SP vs dive');
    } else if (tags.includes('tank')) {
      lines.unshift('Tank kit — soak + zone');
    }
  }

  return {
    lines: lines.slice(0, 3),
    warnings: [...new Set(warnings)].slice(0, 2),
    note: pick.note || null,
    pressure,
  };
}
