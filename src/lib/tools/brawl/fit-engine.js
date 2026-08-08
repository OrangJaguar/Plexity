/**
 * Pure Mythic+ fit scoring from official player + roster signals.
 * Win rate from tiny battlelogs is intentionally not primary.
 */

/**
 * @typedef {object} FitSignals
 * @property {number} trophyPercentile
 * @property {number} completion
 * @property {number} accountPrior
 * @property {number} familiarity
 * @property {boolean} isPocket
 * @property {boolean} isAvoid
 * @property {number} power
 */

/**
 * @typedef {object} FitResult
 * @property {number} brawlerId
 * @property {number} fit
 * @property {number} confidence
 * @property {FitSignals} signals
 */

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function mean(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stddev(nums, avg) {
  if (nums.length < 2) return 0;
  const v = nums.reduce((a, b) => a + (b - avg) ** 2, 0) / nums.length;
  return Math.sqrt(v);
}

/** Percentile rank of value in sorted ascending sample (0–1). */
function percentileRank(sorted, value) {
  if (!sorted.length) return 0.5;
  let below = 0;
  for (const v of sorted) {
    if (v < value) below += 1;
    else break;
  }
  return below / sorted.length;
}

/**
 * @param {object} player — official player payload or snapshot
 * @returns {number} 0–1 account intensity prior
 */
export function accountIntensityPrior(player) {
  const trophies = Number(player?.trophies ?? player?.player_snapshot?.trophies ?? 0);
  const highest = Number(player?.highestTrophies ?? player?.player_snapshot?.highestTrophies ?? trophies);
  const v3 = Number(player?.['3vs3Victories'] ?? player?.player_snapshot?.['3vs3Victories'] ?? 0);
  const solo = Number(player?.soloVictories ?? player?.player_snapshot?.soloVictories ?? 0);
  const duo = Number(player?.duoVictories ?? player?.player_snapshot?.duoVictories ?? 0);
  const wins = v3 + solo + duo;
  const elo = Number(
    player?.rankedElo
    ?? player?.player_snapshot?.ranked?.rankedElo
    ?? 0,
  );

  const trophyScore = clamp(highest / 80000, 0, 1);
  const winScore = clamp(Math.log10(wins + 1) / 4, 0, 1);
  const eloScore = elo > 0 ? clamp(elo / 1200, 0, 1) : trophyScore * 0.7;
  return clamp(0.45 * trophyScore + 0.35 * winScore + 0.2 * eloScore, 0, 1);
}

/**
 * @param {object} brawler — roster row or API brawler
 */
export function completionScore(brawler) {
  const power = Number(brawler.power ?? 0);
  const powerPart = clamp(power / 11, 0, 1) * 0.45;
  const hc = brawler.has_hypercharge || brawler.hasHypercharge ? 0.25 : 0;
  const gadgets = clamp(Number(brawler.gadget_count ?? brawler.gadgets?.length ?? 0) / 2, 0, 1) * 0.1;
  const sps = clamp(Number(brawler.star_power_count ?? brawler.starPowers?.length ?? 0) / 2, 0, 1) * 0.1;
  const gears = clamp(Number(brawler.gear_count ?? brawler.gears?.length ?? 0) / 3, 0, 1) * 0.1;
  return clamp(powerPart + hc + gadgets + sps + gears, 0, 1);
}

/**
 * @param {object[]} roster
 * @param {Set<number>} pocketIds
 * @param {Set<number>} avoidIds
 * @param {Record<number, number>} [familiarityById] — 0–1 from battlelog counts
 * @param {object} [player]
 * @returns {FitResult[]}
 */
export function computeFitForRoster(roster, pocketIds, avoidIds, familiarityById = {}, player = {}) {
  const rows = (roster || []).filter((r) => r?.brawler_id != null || r?.id != null);
  const trophies = rows.map((r) => Number(r.trophies ?? 0));
  const sorted = [...trophies].sort((a, b) => a - b);
  const avg = mean(trophies);
  const sd = stddev(trophies, avg);
  const accountPrior = accountIntensityPrior(player);

  return rows.map((row) => {
    const brawlerId = Number(row.brawler_id ?? row.id);
    const t = Number(row.trophies ?? 0);
    const power = Number(row.power ?? 0);
    const pct = percentileRank(sorted, t);
    // z-score softened into 0–1
    const z = sd > 0 ? (t - avg) / sd : 0;
    const trophySignal = clamp(0.55 * pct + 0.45 * ((z + 2) / 4), 0, 1);
    const completion = completionScore(row);
    const familiarity = clamp(Number(familiarityById[brawlerId] ?? 0), 0, 1);
    const isPocket = pocketIds.has(brawlerId);
    const isAvoid = avoidIds.has(brawlerId);

    let fit = 100 * (
      0.55 * trophySignal
      + 0.2 * completion
      + 0.15 * accountPrior
      + 0.1 * familiarity
    );

    if (isPocket) fit = Math.max(fit, 85);
    if (isAvoid) fit = Math.min(fit, 8);

    const confidence = clamp(
      0.35 + 0.4 * accountPrior + 0.15 * (rows.length / 80) + (isPocket || isAvoid ? 0.2 : 0),
      0.2,
      0.98,
    );

    return {
      brawlerId,
      fit: Math.round(fit * 10) / 10,
      confidence: Math.round(confidence * 1000) / 1000,
      signals: {
        trophyPercentile: Math.round(pct * 1000) / 1000,
        completion: Math.round(completion * 1000) / 1000,
        accountPrior: Math.round(accountPrior * 1000) / 1000,
        familiarity: Math.round(familiarity * 1000) / 1000,
        isPocket,
        isAvoid,
        power,
      },
    };
  });
}

/**
 * Battlelog → familiarity 0–1 by brawler id (frequency only).
 * @param {object} battlelog
 */
export function familiarityFromBattlelog(battlelog) {
  const items = Array.isArray(battlelog?.items) ? battlelog.items : Array.isArray(battlelog) ? battlelog : [];
  /** @type {Record<number, number>} */
  const counts = {};
  let total = 0;
  for (const battle of items) {
    const teams = battle?.battle?.teams || battle?.teams;
    if (!Array.isArray(teams)) continue;
    for (const team of teams) {
      for (const p of team || []) {
        const id = Number(p?.brawler?.id);
        if (!Number.isFinite(id)) continue;
        counts[id] = (counts[id] || 0) + 1;
        total += 1;
      }
    }
  }
  /** @type {Record<number, number>} */
  const out = {};
  const max = Math.max(1, ...Object.values(counts), 1);
  for (const [id, c] of Object.entries(counts)) {
    out[Number(id)] = clamp(c / max, 0, 1);
  }
  return out;
}
