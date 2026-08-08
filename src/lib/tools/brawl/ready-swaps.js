/**
 * Ready-phase (~17s) our-side swap proposals.
 * Never proposes enemy swaps. Both seats must own both brawlers at P11.
 */

/**
 * @param {Array<{ brawlerId: number, playerUserId?: string, nickname?: string, slot?: number }>} ourPicks
 * @param {Array<{ brawlerId: number }>} enemyPicks
 */
export function isDraftFullyPicked(ourPicks = [], enemyPicks = []) {
  return (ourPicks || []).length >= 3 && (enemyPicks || []).length >= 3;
}

/**
 * @param {Map<string, Set<number>> | Record<string, number[]>} p11ByUserId
 * @param {string} userId
 * @param {number} brawlerId
 */
export function userOwnsP11(p11ByUserId, userId, brawlerId) {
  if (!userId || brawlerId == null) return false;
  const id = Number(brawlerId);
  if (!Number.isFinite(id)) return false;
  if (p11ByUserId instanceof Map) {
    const set = p11ByUserId.get(userId);
    return Boolean(set?.has(id));
  }
  const list = p11ByUserId?.[userId] || [];
  return list.map(Number).includes(id);
}

/**
 * Find legal our-side seat swaps (both own both at P11).
 * @param {Array<{ brawlerId: number, playerUserId?: string, nickname?: string, slot?: number }>} ourPicks
 * @param {Map<string, Set<number>>} p11ByUserId
 * @returns {Array<{ fromIndex: number, toIndex: number, from: object, to: object, label: string }>}
 */
export function proposeReadySwaps(ourPicks = [], p11ByUserId) {
  const picks = [...(ourPicks || [])].slice(0, 3);
  const out = [];
  for (let i = 0; i < picks.length; i += 1) {
    for (let j = i + 1; j < picks.length; j += 1) {
      const a = picks[i];
      const b = picks[j];
      const ua = a.playerUserId;
      const ub = b.playerUserId;
      if (!ua || !ub || ua === ub) continue;
      // Skip placeholder solo seats
      if (String(ua).includes('-s') || String(ub).includes('-s')) continue;
      if (String(ua).startsWith('seat-') || String(ub).startsWith('seat-')) continue;

      const aOwnsBoth = userOwnsP11(p11ByUserId, ua, a.brawlerId)
        && userOwnsP11(p11ByUserId, ua, b.brawlerId);
      const bOwnsBoth = userOwnsP11(p11ByUserId, ub, a.brawlerId)
        && userOwnsP11(p11ByUserId, ub, b.brawlerId);
      if (!aOwnsBoth || !bOwnsBoth) continue;

      out.push({
        fromIndex: i,
        toIndex: j,
        from: a,
        to: b,
        label: `${a.nickname || 'A'} ↔ ${b.nickname || 'B'}`,
      });
    }
  }
  return out;
}

/**
 * Apply a seat swap on our picks (swap brawler assignments between two indices).
 * @param {Array<object>} ourPicks
 * @param {number} fromIndex
 * @param {number} toIndex
 */
export function applyReadySwap(ourPicks, fromIndex, toIndex) {
  const next = (ourPicks || []).map((p) => ({ ...p }));
  if (
    fromIndex < 0
    || toIndex < 0
    || fromIndex >= next.length
    || toIndex >= next.length
    || fromIndex === toIndex
  ) {
    return next;
  }
  const a = next[fromIndex];
  const b = next[toIndex];
  next[fromIndex] = {
    ...a,
    brawlerId: b.brawlerId,
  };
  next[toIndex] = {
    ...b,
    brawlerId: a.brawlerId,
  };
  return next;
}

/**
 * Dual-confirm helper — both seat user ids must be marked true.
 * @param {{ confirms?: Record<string, boolean>, fromUserId?: string, toUserId?: string }} swap
 */
export function readySwapFullyConfirmed(swap) {
  if (!swap?.fromUserId || !swap?.toUserId) return false;
  const c = swap.confirms || {};
  return Boolean(c[swap.fromUserId] && c[swap.toUserId]);
}
