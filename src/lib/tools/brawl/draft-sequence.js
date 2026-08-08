/**
 * Mythic Ranked 3v3 pick sequence + party-leader / Elo seat order.
 *
 * In-game: party leader = last pick on that team; of the other two,
 * lower ranked Elo picks before higher Elo.
 * App admin ≠ party leader — set party leader explicitly.
 *
 * Sequence (A = coin winners): A1 → B1 → B2 → A2 → A3 → B3
 */

/**
 * @typedef {{ userId?: string, nickname?: string, slot?: number, avatarUrl?: string | null, rankedElo?: number | null }} DraftSeat
 */

/**
 * @param {'' | 'us' | 'enemy'} coinFlip
 * @param {DraftSeat[]} ourSeats
 */
export function buildRankedPickTimeline(coinFlip, ourSeats = []) {
  if (coinFlip !== 'us' && coinFlip !== 'enemy') return [];

  const seats = [0, 1, 2].map((i) => {
    const s = ourSeats[i] || {};
    return {
      userId: s.userId,
      nickname: s.nickname || `Seat ${i + 1}`,
      avatarUrl: s.avatarUrl ?? null,
      rankedElo: s.rankedElo ?? null,
      slot: i,
    };
  });

  const sideOf = {
    A: coinFlip === 'us' ? 'us' : 'enemy',
    B: coinFlip === 'us' ? 'enemy' : 'us',
  };

  /** @type {Array<{ lane: 'A' | 'B', seatIndex: number }>} */
  const pattern = [
    { lane: 'A', seatIndex: 0 },
    { lane: 'B', seatIndex: 0 },
    { lane: 'B', seatIndex: 1 },
    { lane: 'A', seatIndex: 1 },
    { lane: 'A', seatIndex: 2 },
    { lane: 'B', seatIndex: 2 },
  ];

  return pattern.map((p, step) => {
    const side = /** @type {'us' | 'enemy'} */ (sideOf[p.lane]);
    const ours = side === 'us' ? seats[p.seatIndex] : null;
    const laneSeat = `${p.lane}${p.seatIndex + 1}`;
    const nickname = side === 'us'
      ? ours.nickname
      : `Enemy ${p.seatIndex + 1}`;
    return {
      step: step + 1,
      side,
      seatIndex: p.seatIndex,
      laneSeat,
      label: `${laneSeat} · ${side === 'us' ? 'Us' : 'Enemy'}`,
      nickname,
      userId: ours?.userId,
      avatarUrl: ours?.avatarUrl ?? null,
    };
  });
}

/**
 * @param {ReturnType<typeof buildRankedPickTimeline>} timeline
 * @param {number} ourCount
 * @param {number} enemyCount
 */
export function nextPickStep(timeline, ourCount, enemyCount) {
  let ourSeen = 0;
  let enemySeen = 0;
  for (const row of timeline) {
    if (row.side === 'us') {
      if (ourSeen < ourCount) {
        ourSeen += 1;
        continue;
      }
      return row;
    }
    if (enemySeen < enemyCount) {
      enemySeen += 1;
      continue;
    }
    return row;
  }
  return null;
}

/**
 * Party leader → seat 3 (last pick on our side).
 * Remaining two: lower Elo → seat 1, higher Elo → seat 2.
 * Missing Elo treated as 0 (picks earlier).
 *
 * @param {DraftSeat[]} seats
 * @param {string} partyLeaderUserId
 * @returns {DraftSeat[]}
 */
export function orderSeatsByPartyLeaderAndElo(seats, partyLeaderUserId) {
  const list = [...(seats || [])].map((s, i) => ({ ...s, slot: i }));
  if (!list.length || !partyLeaderUserId) {
    return list.map((s, i) => ({ ...s, slot: i }));
  }

  const captain = list.find((s) => s.userId === partyLeaderUserId);
  const others = list.filter((s) => s.userId !== partyLeaderUserId);

  others.sort((a, b) => {
    const ea = Number(a.rankedElo);
    const eb = Number(b.rankedElo);
    const na = Number.isFinite(ea) ? ea : 0;
    const nb = Number.isFinite(eb) ? eb : 0;
    if (na !== nb) return na - nb; // lower Elo first
    return String(a.nickname || '').localeCompare(String(b.nickname || ''));
  });

  const ordered = [
    ...others,
    ...(captain ? [captain] : []),
  ];

  // If captain missing from list, keep leftovers at end
  for (const s of list) {
    if (!ordered.some((o) => o.userId === s.userId)) ordered.push(s);
  }

  return ordered.slice(0, 3).map((s, i) => ({ ...s, slot: i }));
}

/**
 * @param {DraftSeat[]} seats
 * @param {number} fromIndex
 * @param {number} toIndex
 */
export function reorderSeats(seats, fromIndex, toIndex) {
  const next = [...(seats || [])];
  if (
    fromIndex < 0
    || toIndex < 0
    || fromIndex >= next.length
    || toIndex >= next.length
    || fromIndex === toIndex
  ) {
    return next.map((s, i) => ({ ...s, slot: i }));
  }
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next.map((s, i) => ({ ...s, slot: i }));
}

/** Solo: which of our three seats am I? 0→1st, 1→2nd, 2→last (captain seat). */
export const SOLO_SEAT_OPTIONS = [
  { value: 0, labelWhenUs: 'A1 (1st pick)', labelWhenEnemy: 'B1 (1st on our side)' },
  { value: 1, labelWhenUs: 'A2 (2nd pick)', labelWhenEnemy: 'B2 (2nd on our side)' },
  { value: 2, labelWhenUs: 'A3 (last / captain)', labelWhenEnemy: 'B3 (last / captain)' },
];
