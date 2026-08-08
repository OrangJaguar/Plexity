import { requireAuth } from '@/api/requireAuth';
import { getSupabase } from '@/api/supabaseClient';
import { getBrawlPlayerLink } from '@/api/brawl/playerLink';
import { normalizeBrawlTag } from '@/api/brawl/tags';

const INVITE_TTL_MS = 15 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeInviteCode(length = 6) {
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

async function defaultNickname(user) {
  const link = await getBrawlPlayerLink().catch(() => null);
  if (link?.display_name) return String(link.display_name).slice(0, 24);
  const email = user.email || '';
  const local = email.split('@')[0]?.trim();
  return (local || 'Player').slice(0, 24);
}

/** @returns {Promise<{ trio: object, members: object[], isAdmin: boolean } | null>} */
export async function getMyBrawlTrio() {
  const user = await requireAuth();
  const { data: membership, error: memError } = await getSupabase()
    .from('brawl_trio_members')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (memError) throw memError;
  if (!membership) return null;

  const { data: trio, error: trioError } = await getSupabase()
    .from('brawl_trios')
    .select('*')
    .eq('id', membership.trio_id)
    .single();
  if (trioError) throw trioError;

  const { data: members, error: membersError } = await getSupabase()
    .from('brawl_trio_members')
    .select('*')
    .eq('trio_id', trio.id)
    .order('joined_at', { ascending: true });
  if (membersError) throw membersError;

  return {
    trio,
    members: members ?? [],
    isAdmin: trio.admin_user_id === user.id,
  };
}

/** @param {string} [name] */
export async function createBrawlTrio(name = 'Trio') {
  const user = await requireAuth();
  const existing = await getMyBrawlTrio();
  if (existing) throw new Error('You are already in a trio. Leave it before creating another.');

  const now = Date.now();
  const nickname = await defaultNickname(user);
  const link = await getBrawlPlayerLink().catch(() => null);

  const { data: trio, error: trioError } = await getSupabase()
    .from('brawl_trios')
    .insert({
      name: String(name || 'Trio').trim().slice(0, 40) || 'Trio',
      admin_user_id: user.id,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();
  if (trioError) throw trioError;

  const { error: memberError } = await getSupabase()
    .from('brawl_trio_members')
    .insert({
      trio_id: trio.id,
      user_id: user.id,
      nickname,
      player_tag: link?.player_tag || null,
      joined_at: now,
    });
  if (memberError) {
    await getSupabase().from('brawl_trios').delete().eq('id', trio.id);
    throw memberError;
  }

  return getMyBrawlTrio();
}

export async function createBrawlTrioInvite() {
  const user = await requireAuth();
  const mine = await getMyBrawlTrio();
  if (!mine?.isAdmin) throw new Error('Only the trio admin can create invites.');

  const now = Date.now();
  const code = makeInviteCode(6);
  const { data, error } = await getSupabase()
    .from('brawl_trio_invites')
    .insert({
      trio_id: mine.trio.id,
      code,
      created_by: user.id,
      expires_at: now + INVITE_TTL_MS,
      created_at: now,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** @param {string} code */
export async function joinBrawlTrioWithCode(code) {
  const user = await requireAuth();
  const existing = await getMyBrawlTrio();
  if (existing) throw new Error('You are already in a trio.');

  const normalized = String(code || '').trim().toUpperCase();
  if (normalized.length < 4) throw new Error('Enter a valid invite code.');

  const now = Date.now();
  const { data: invites, error: findError } = await getSupabase()
    .from('brawl_trio_invites')
    .select('*')
    .eq('code', normalized)
    .is('redeemed_at', null)
    .gt('expires_at', now)
    .limit(1);
  if (findError) throw findError;
  const invite = invites?.[0];
  if (!invite) throw new Error('Invite not found or expired.');

  const { count, error: countError } = await getSupabase()
    .from('brawl_trio_members')
    .select('*', { count: 'exact', head: true })
    .eq('trio_id', invite.trio_id);
  if (countError) throw countError;
  if ((count ?? 0) >= 3) throw new Error('This trio is full.');

  const nickname = await defaultNickname(user);
  const link = await getBrawlPlayerLink().catch(() => null);

  const { error: memberError } = await getSupabase()
    .from('brawl_trio_members')
    .insert({
      trio_id: invite.trio_id,
      user_id: user.id,
      nickname,
      player_tag: link?.player_tag || null,
      joined_at: now,
    });
  if (memberError) throw memberError;

  await getSupabase()
    .from('brawl_trio_invites')
    .update({ redeemed_by: user.id, redeemed_at: now })
    .eq('id', invite.id);

  return getMyBrawlTrio();
}

/** @param {string} memberUserId */
export async function transferBrawlTrioAdmin(memberUserId) {
  const user = await requireAuth();
  const mine = await getMyBrawlTrio();
  if (!mine?.isAdmin) throw new Error('Only the admin can transfer admin.');
  if (memberUserId === user.id) throw new Error('Pick another member.');

  const target = mine.members.find((m) => m.user_id === memberUserId);
  if (!target) throw new Error('That player is not in your trio.');

  const { error } = await getSupabase()
    .from('brawl_trios')
    .update({ admin_user_id: memberUserId, updated_at: Date.now() })
    .eq('id', mine.trio.id);
  if (error) throw error;
  return getMyBrawlTrio();
}

/** @param {string} nickname */
export async function updateMyBrawlNickname(nickname) {
  const user = await requireAuth();
  const trimmed = String(nickname || '').trim().slice(0, 24);
  if (!trimmed) throw new Error('Nickname required.');
  const { error } = await getSupabase()
    .from('brawl_trio_members')
    .update({ nickname: trimmed })
    .eq('user_id', user.id);
  if (error) throw error;
  return getMyBrawlTrio();
}

export async function leaveBrawlTrio() {
  const user = await requireAuth();
  const mine = await getMyBrawlTrio();
  if (!mine) return null;

  if (mine.isAdmin && mine.members.length > 1) {
    throw new Error('Transfer admin to someone else before leaving.');
  }

  const { error } = await getSupabase()
    .from('brawl_trio_members')
    .delete()
    .eq('user_id', user.id);
  if (error) throw error;

  if (mine.members.length <= 1) {
    await getSupabase().from('brawl_trios').delete().eq('id', mine.trio.id);
  }
  return null;
}

/** @param {string} memberUserId */
export async function kickBrawlTrioMember(memberUserId) {
  const user = await requireAuth();
  const mine = await getMyBrawlTrio();
  if (!mine?.isAdmin) throw new Error('Only the admin can kick members.');
  if (memberUserId === user.id) throw new Error('Use leave instead of kicking yourself.');

  const { error } = await getSupabase()
    .from('brawl_trio_members')
    .delete()
    .eq('trio_id', mine.trio.id)
    .eq('user_id', memberUserId);
  if (error) throw error;
  return getMyBrawlTrio();
}

/** Refresh member player_tag from linked account. */
export async function refreshMyTrioPlayerTag() {
  const user = await requireAuth();
  const link = await getBrawlPlayerLink();
  if (!link?.player_tag) return getMyBrawlTrio();
  const tag = normalizeBrawlTag(link.player_tag);
  const { error } = await getSupabase()
    .from('brawl_trio_members')
    .update({ player_tag: tag })
    .eq('user_id', user.id);
  if (error) throw error;
  return getMyBrawlTrio();
}
