-- Plexity Brawl tool schema (Plan 02)
-- Run this ENTIRE file once in Supabase SQL Editor.
-- Assumes 0001_init (+ 0002 grants) already applied; uses public.is_admin() if present.

begin;

-- ===========================================================================
-- 1) TABLES
-- ===========================================================================

create table if not exists public.brawl_player_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  player_tag text not null,
  display_name text,
  last_synced_at bigint,
  player_snapshot jsonb not null default '{}'::jsonb,
  created_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  updated_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  constraint brawl_player_links_tag_nonempty check (length(trim(player_tag)) > 0)
);

create index if not exists brawl_player_links_tag_idx
  on public.brawl_player_links (upper(player_tag));

create table if not exists public.brawl_roster_brawlers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brawler_id bigint not null,
  power integer,
  trophies integer,
  highest_trophies integer,
  has_hypercharge boolean not null default false,
  gadget_count integer not null default 0,
  star_power_count integer not null default 0,
  gear_count integer not null default 0,
  raw jsonb not null default '{}'::jsonb,
  updated_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  unique (user_id, brawler_id)
);

create index if not exists brawl_roster_brawlers_user_idx
  on public.brawl_roster_brawlers (user_id);

create table if not exists public.brawl_trios (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Trio',
  admin_user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  updated_at bigint not null default ((extract(epoch from now()) * 1000)::bigint)
);

create index if not exists brawl_trios_admin_idx
  on public.brawl_trios (admin_user_id);

-- Prototype: each user is in at most one trio.
create table if not exists public.brawl_trio_members (
  id uuid primary key default gen_random_uuid(),
  trio_id uuid not null references public.brawl_trios (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null,
  player_tag text,
  joined_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  unique (trio_id, user_id),
  unique (user_id),
  constraint brawl_trio_members_nickname_nonempty check (length(trim(nickname)) > 0)
);

create index if not exists brawl_trio_members_trio_idx
  on public.brawl_trio_members (trio_id);

create table if not exists public.brawl_trio_invites (
  id uuid primary key default gen_random_uuid(),
  trio_id uuid not null references public.brawl_trios (id) on delete cascade,
  code text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at bigint not null,
  redeemed_by uuid references auth.users (id) on delete set null,
  redeemed_at bigint,
  created_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  constraint brawl_trio_invites_code_nonempty check (length(trim(code)) >= 4)
);

create unique index if not exists brawl_trio_invites_code_active_uidx
  on public.brawl_trio_invites (upper(code))
  where redeemed_at is null;

create index if not exists brawl_trio_invites_trio_idx
  on public.brawl_trio_invites (trio_id);

create table if not exists public.brawl_pockets_avoids (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brawler_id bigint not null,
  kind text not null check (kind in ('pocket', 'avoid')),
  mode text,
  created_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  unique (user_id, brawler_id, kind, mode)
);

create index if not exists brawl_pockets_avoids_user_idx
  on public.brawl_pockets_avoids (user_id);

create table if not exists public.brawl_fit_cache (
  user_id uuid not null references auth.users (id) on delete cascade,
  brawler_id bigint not null,
  fit double precision not null default 0,
  confidence double precision not null default 0,
  signals jsonb not null default '{}'::jsonb,
  computed_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  primary key (user_id, brawler_id)
);

create table if not exists public.brawl_upgrade_queue (
  id uuid primary key default gen_random_uuid(),
  trio_id uuid not null references public.brawl_trios (id) on delete cascade,
  brawler_id bigint not null,
  sort_order integer not null default 0,
  note text,
  added_by uuid references auth.users (id) on delete set null,
  created_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  unique (trio_id, brawler_id)
);

create index if not exists brawl_upgrade_queue_trio_idx
  on public.brawl_upgrade_queue (trio_id, sort_order);

create table if not exists public.brawl_meta_priors (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users (id) on delete cascade,
  trio_id uuid references public.brawl_trios (id) on delete cascade,
  label text,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  updated_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  constraint brawl_meta_priors_scope check (
    (owner_user_id is not null and trio_id is null)
    or (owner_user_id is null and trio_id is not null)
  )
);

create index if not exists brawl_meta_priors_user_idx
  on public.brawl_meta_priors (owner_user_id)
  where owner_user_id is not null;

create index if not exists brawl_meta_priors_trio_idx
  on public.brawl_meta_priors (trio_id)
  where trio_id is not null;

create table if not exists public.brawl_draft_sessions (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('solo', 'trio')),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  trio_id uuid references public.brawl_trios (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  created_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  constraint brawl_draft_sessions_scope_shape check (
    (scope = 'solo' and trio_id is null)
    or (scope = 'trio' and trio_id is not null)
  )
);

create unique index if not exists brawl_draft_sessions_solo_owner_uidx
  on public.brawl_draft_sessions (owner_user_id)
  where scope = 'solo';

create unique index if not exists brawl_draft_sessions_trio_uidx
  on public.brawl_draft_sessions (trio_id)
  where scope = 'trio';

-- ===========================================================================
-- 2) HELPERS
-- ===========================================================================

create or replace function public.is_brawl_trio_member(p_trio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.brawl_trio_members m
    where m.trio_id = p_trio_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_brawl_trio_admin(p_trio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.brawl_trios t
    where t.id = p_trio_id
      and t.admin_user_id = auth.uid()
  );
$$;

revoke all on function public.is_brawl_trio_member(uuid) from public;
revoke all on function public.is_brawl_trio_admin(uuid) from public;
grant execute on function public.is_brawl_trio_member(uuid) to authenticated, service_role;
grant execute on function public.is_brawl_trio_admin(uuid) to authenticated, service_role;

-- ===========================================================================
-- 3) RLS
-- ===========================================================================

alter table public.brawl_player_links enable row level security;
alter table public.brawl_roster_brawlers enable row level security;
alter table public.brawl_trios enable row level security;
alter table public.brawl_trio_members enable row level security;
alter table public.brawl_trio_invites enable row level security;
alter table public.brawl_pockets_avoids enable row level security;
alter table public.brawl_fit_cache enable row level security;
alter table public.brawl_upgrade_queue enable row level security;
alter table public.brawl_meta_priors enable row level security;
alter table public.brawl_draft_sessions enable row level security;

-- player links / roster / pockets / fit: own rows
drop policy if exists brawl_player_links_all_own on public.brawl_player_links;
create policy brawl_player_links_all_own on public.brawl_player_links
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists brawl_roster_brawlers_all_own on public.brawl_roster_brawlers;
create policy brawl_roster_brawlers_all_own on public.brawl_roster_brawlers
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists brawl_pockets_avoids_all_own on public.brawl_pockets_avoids;
create policy brawl_pockets_avoids_all_own on public.brawl_pockets_avoids
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists brawl_fit_cache_all_own on public.brawl_fit_cache;
create policy brawl_fit_cache_all_own on public.brawl_fit_cache
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Trios: members can read; admin manages; creator inserts as admin
drop policy if exists brawl_trios_select_member on public.brawl_trios;
create policy brawl_trios_select_member on public.brawl_trios
  for select to authenticated
  using (public.is_brawl_trio_member(id) or admin_user_id = auth.uid());

drop policy if exists brawl_trios_insert_admin on public.brawl_trios;
create policy brawl_trios_insert_admin on public.brawl_trios
  for insert to authenticated
  with check (admin_user_id = auth.uid());

drop policy if exists brawl_trios_update_admin on public.brawl_trios;
create policy brawl_trios_update_admin on public.brawl_trios
  for update to authenticated
  using (public.is_brawl_trio_admin(id))
  with check (public.is_brawl_trio_admin(id) or admin_user_id = auth.uid());

drop policy if exists brawl_trios_delete_admin on public.brawl_trios;
create policy brawl_trios_delete_admin on public.brawl_trios
  for delete to authenticated
  using (public.is_brawl_trio_admin(id));

-- Members: readable by trio; insert self or admin; update nicknames as self/admin; leave self / kick admin
drop policy if exists brawl_trio_members_select on public.brawl_trio_members;
create policy brawl_trio_members_select on public.brawl_trio_members
  for select to authenticated
  using (public.is_brawl_trio_member(trio_id) or user_id = auth.uid());

drop policy if exists brawl_trio_members_insert on public.brawl_trio_members;
create policy brawl_trio_members_insert on public.brawl_trio_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or public.is_brawl_trio_admin(trio_id)
  );

drop policy if exists brawl_trio_members_update on public.brawl_trio_members;
create policy brawl_trio_members_update on public.brawl_trio_members
  for update to authenticated
  using (user_id = auth.uid() or public.is_brawl_trio_admin(trio_id))
  with check (user_id = auth.uid() or public.is_brawl_trio_admin(trio_id));

drop policy if exists brawl_trio_members_delete on public.brawl_trio_members;
create policy brawl_trio_members_delete on public.brawl_trio_members
  for delete to authenticated
  using (user_id = auth.uid() or public.is_brawl_trio_admin(trio_id));

-- Invites: members can read own trio invites; admin creates; any authenticated can select by code path via redeem (select unredeemed)
drop policy if exists brawl_trio_invites_select on public.brawl_trio_invites;
create policy brawl_trio_invites_select on public.brawl_trio_invites
  for select to authenticated
  using (
    public.is_brawl_trio_member(trio_id)
    or created_by = auth.uid()
    or (redeemed_at is null and expires_at > ((extract(epoch from now()) * 1000)::bigint))
  );

drop policy if exists brawl_trio_invites_insert on public.brawl_trio_invites;
create policy brawl_trio_invites_insert on public.brawl_trio_invites
  for insert to authenticated
  with check (public.is_brawl_trio_admin(trio_id) and created_by = auth.uid());

drop policy if exists brawl_trio_invites_update on public.brawl_trio_invites;
create policy brawl_trio_invites_update on public.brawl_trio_invites
  for update to authenticated
  using (
    public.is_brawl_trio_admin(trio_id)
    or (redeemed_at is null and expires_at > ((extract(epoch from now()) * 1000)::bigint))
  )
  with check (true);

drop policy if exists brawl_trio_invites_delete on public.brawl_trio_invites;
create policy brawl_trio_invites_delete on public.brawl_trio_invites
  for delete to authenticated
  using (public.is_brawl_trio_admin(trio_id));

-- Upgrade queue: trio members read; admin write
drop policy if exists brawl_upgrade_queue_select on public.brawl_upgrade_queue;
create policy brawl_upgrade_queue_select on public.brawl_upgrade_queue
  for select to authenticated
  using (public.is_brawl_trio_member(trio_id));

drop policy if exists brawl_upgrade_queue_write on public.brawl_upgrade_queue;
create policy brawl_upgrade_queue_write on public.brawl_upgrade_queue
  for all to authenticated
  using (public.is_brawl_trio_admin(trio_id))
  with check (public.is_brawl_trio_admin(trio_id));

-- Meta priors: owner or trio members; writes by owner / admin
drop policy if exists brawl_meta_priors_select on public.brawl_meta_priors;
create policy brawl_meta_priors_select on public.brawl_meta_priors
  for select to authenticated
  using (
    owner_user_id = auth.uid()
    or (trio_id is not null and public.is_brawl_trio_member(trio_id))
  );

drop policy if exists brawl_meta_priors_insert on public.brawl_meta_priors;
create policy brawl_meta_priors_insert on public.brawl_meta_priors
  for insert to authenticated
  with check (
    owner_user_id = auth.uid()
    or (trio_id is not null and public.is_brawl_trio_admin(trio_id))
  );

drop policy if exists brawl_meta_priors_update on public.brawl_meta_priors;
create policy brawl_meta_priors_update on public.brawl_meta_priors
  for update to authenticated
  using (
    owner_user_id = auth.uid()
    or (trio_id is not null and public.is_brawl_trio_admin(trio_id))
  )
  with check (
    owner_user_id = auth.uid()
    or (trio_id is not null and public.is_brawl_trio_admin(trio_id))
  );

drop policy if exists brawl_meta_priors_delete on public.brawl_meta_priors;
create policy brawl_meta_priors_delete on public.brawl_meta_priors
  for delete to authenticated
  using (
    owner_user_id = auth.uid()
    or (trio_id is not null and public.is_brawl_trio_admin(trio_id))
  );

-- Draft sessions: solo = owner; trio = members read, admin write
drop policy if exists brawl_draft_sessions_select on public.brawl_draft_sessions;
create policy brawl_draft_sessions_select on public.brawl_draft_sessions
  for select to authenticated
  using (
    (scope = 'solo' and owner_user_id = auth.uid())
    or (scope = 'trio' and trio_id is not null and public.is_brawl_trio_member(trio_id))
  );

drop policy if exists brawl_draft_sessions_insert on public.brawl_draft_sessions;
create policy brawl_draft_sessions_insert on public.brawl_draft_sessions
  for insert to authenticated
  with check (
    (scope = 'solo' and owner_user_id = auth.uid() and trio_id is null)
    or (
      scope = 'trio'
      and trio_id is not null
      and public.is_brawl_trio_admin(trio_id)
      and owner_user_id = auth.uid()
    )
  );

drop policy if exists brawl_draft_sessions_update on public.brawl_draft_sessions;
create policy brawl_draft_sessions_update on public.brawl_draft_sessions
  for update to authenticated
  using (
    (scope = 'solo' and owner_user_id = auth.uid())
    or (scope = 'trio' and trio_id is not null and public.is_brawl_trio_admin(trio_id))
  )
  with check (
    (scope = 'solo' and owner_user_id = auth.uid())
    or (scope = 'trio' and trio_id is not null and public.is_brawl_trio_admin(trio_id))
  );

drop policy if exists brawl_draft_sessions_delete on public.brawl_draft_sessions;
create policy brawl_draft_sessions_delete on public.brawl_draft_sessions
  for delete to authenticated
  using (
    (scope = 'solo' and owner_user_id = auth.uid())
    or (scope = 'trio' and trio_id is not null and public.is_brawl_trio_admin(trio_id))
  );

-- ===========================================================================
-- 4) GRANTS (safe if 0002 defaults already apply)
-- ===========================================================================

grant select, insert, update, delete on
  public.brawl_player_links,
  public.brawl_roster_brawlers,
  public.brawl_trios,
  public.brawl_trio_members,
  public.brawl_trio_invites,
  public.brawl_pockets_avoids,
  public.brawl_fit_cache,
  public.brawl_upgrade_queue,
  public.brawl_meta_priors,
  public.brawl_draft_sessions
to authenticated, service_role;

commit;
