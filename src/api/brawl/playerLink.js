import { requireAuth } from '@/api/requireAuth';
import { getSupabase } from '@/api/supabaseClient';
import { fetchBrawlPlayer } from '@/api/brawl/client';
import { formatBrawlTagDisplay, normalizeBrawlTag } from '@/api/brawl/tags';

function mapRosterRow(userId, brawler, now) {
  const gadgets = Array.isArray(brawler?.gadgets) ? brawler.gadgets.length : 0;
  const starPowers = Array.isArray(brawler?.starPowers) ? brawler.starPowers.length : 0;
  const gears = Array.isArray(brawler?.gears) ? brawler.gears.length : 0;
  const hyper = Array.isArray(brawler?.hypercharges)
    ? brawler.hypercharges.length > 0
    : Array.isArray(brawler?.hyperCharges)
      ? brawler.hyperCharges.length > 0
      : Boolean(brawler?.hypercharge || brawler?.hyperCharge);
  return {
    user_id: userId,
    brawler_id: Number(brawler.id),
    power: brawler.power != null ? Number(brawler.power) : null,
    trophies: brawler.trophies != null ? Number(brawler.trophies) : null,
    highest_trophies: brawler.highestTrophies != null ? Number(brawler.highestTrophies) : null,
    has_hypercharge: hyper,
    gadget_count: gadgets,
    star_power_count: starPowers,
    gear_count: gears,
    raw: brawler,
    updated_at: now,
  };
}

/** @returns {Promise<object | null>} */
export async function getBrawlPlayerLink() {
  const user = await requireAuth();
  const { data, error } = await getSupabase()
    .from('brawl_player_links')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Save tag without syncing roster.
 * @param {string} playerTag
 */
export async function saveBrawlPlayerTag(playerTag) {
  const user = await requireAuth();
  const tag = normalizeBrawlTag(playerTag);
  const now = Date.now();
  const { data, error } = await getSupabase()
    .from('brawl_player_links')
    .upsert({
      user_id: user.id,
      player_tag: tag,
      updated_at: now,
    }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fetch live player + upsert link + replace roster cache.
 * @param {string} [playerTag]
 */
export async function syncBrawlPlayer(playerTag) {
  const user = await requireAuth();
  const existing = await getBrawlPlayerLink();
  const tag = normalizeBrawlTag(playerTag || existing?.player_tag || '');
  const player = await fetchBrawlPlayer(tag);
  const now = Date.now();

  const snapshot = {
    name: player?.name || null,
    tag: player?.tag || formatBrawlTagDisplay(tag),
    trophies: player?.trophies ?? null,
    highestTrophies: player?.highestTrophies ?? null,
    expLevel: player?.expLevel ?? null,
    '3vs3Victories': player?.['3vs3Victories'] ?? null,
    soloVictories: player?.soloVictories ?? null,
    duoVictories: player?.duoVictories ?? null,
    club: player?.club || null,
    ranked: {
      rankedRank: player?.rankedRank ?? null,
      rankedName: player?.rankedName ?? null,
      rankedElo: player?.rankedElo ?? null,
    },
  };

  const { data: link, error: linkError } = await getSupabase()
    .from('brawl_player_links')
    .upsert({
      user_id: user.id,
      player_tag: tag,
      display_name: player?.name || null,
      last_synced_at: now,
      player_snapshot: snapshot,
      updated_at: now,
    }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (linkError) throw linkError;

  const brawlers = Array.isArray(player?.brawlers) ? player.brawlers : [];
  const { error: delError } = await getSupabase()
    .from('brawl_roster_brawlers')
    .delete()
    .eq('user_id', user.id);
  if (delError) throw delError;

  if (brawlers.length) {
    const rows = brawlers
      .filter((b) => b?.id != null)
      .map((b) => mapRosterRow(user.id, b, now));
    if (rows.length) {
      const { error: insError } = await getSupabase()
        .from('brawl_roster_brawlers')
        .insert(rows);
      if (insError) throw insError;
    }
  }

  let fitCount = 0;
  try {
    const { recomputeBrawlFitCache } = await import('@/api/brawl/fit');
    const fits = await recomputeBrawlFitCache();
    fitCount = fits.length;
  } catch {
    fitCount = 0;
  }

  return {
    link,
    player,
    rosterCount: brawlers.length,
    p11Count: brawlers.filter((b) => Number(b?.power) >= 11).length,
    fitCount,
  };
}

export async function listBrawlRoster() {
  const user = await requireAuth();
  const { data, error } = await getSupabase()
    .from('brawl_roster_brawlers')
    .select('*')
    .eq('user_id', user.id)
    .order('trophies', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * P11 sets for every trio member (needs 0004 trio roster SELECT policy).
 * Falls back to only the current user's roster if mates are blocked by RLS.
 * @returns {Promise<Map<string, Set<number>>>}
 */
export async function listTrioMemberP11Maps() {
  const user = await requireAuth();
  const { getMyBrawlTrio } = await import('@/api/brawl/trio');
  const mine = await getMyBrawlTrio().catch(() => null);
  const userIds = mine?.members?.length
    ? mine.members.map((m) => m.user_id).filter(Boolean)
    : [user.id];

  const { data, error } = await getSupabase()
    .from('brawl_roster_brawlers')
    .select('user_id, brawler_id, power')
    .in('user_id', userIds)
    .gte('power', 11);
  if (error) throw error;

  /** @type {Map<string, Set<number>>} */
  const map = new Map();
  for (const uid of userIds) map.set(uid, new Set());
  for (const row of data || []) {
    const uid = row.user_id;
    const id = Number(row.brawler_id);
    if (!uid || !Number.isFinite(id)) continue;
    if (!map.has(uid)) map.set(uid, new Set());
    map.get(uid).add(id);
  }
  return map;
}
