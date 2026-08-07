-- Plexity init schema (Base44 → Supabase)
-- Plan 02 — no AdminConverter* tables
-- Fresh DB only — no Base44 data migration.
--
-- IMPORTANT: Paste and run this ENTIRE file in one go (SQL Editor → Run).
-- Fixed order: tables first, then functions, then RLS policies.

begin;

-- ===========================================================================
-- 1) TABLES (must exist before SQL functions that reference them)
-- ===========================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  updated_at bigint not null default ((extract(epoch from now()) * 1000)::bigint)
);

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_role_idx on public.profiles (role);

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  username text,
  display_name text,
  created_at bigint,
  last_active_at bigint,
  country text,
  us_state text,
  onboarding_completed_at bigint,
  theme_dark boolean,
  haptics boolean,
  audio boolean,
  strict_mode boolean,
  username_changed_at bigint,
  pinned_tool_ids jsonb default '[]'::jsonb,
  tools_sleep_buffer_min double precision,
  tools_travel_buffer_min double precision,
  tools_dashboard_widgets jsonb,
  tools_dashboard_widget_layout jsonb,
  tools_journal_tags jsonb,
  tools_custom_categories jsonb,
  tools_habit_checks jsonb,
  tools_habit_definitions jsonb,
  journal_min_words double precision,
  journal_daily_prompt_enabled boolean,
  journal_pin_hash text,
  journal_grace_used_at bigint,
  journal_streak_saved_shown_at bigint,
  focus_last_preset text,
  focus_custom_work_min double precision,
  focus_custom_break_min double precision,
  focus_ambient_sound text,
  focus_ambient_volume double precision,
  tools_weather_city text,
  tools_weather_location jsonb,
  tools_weather_unit text,
  tools_stock_symbols jsonb,
  unique (user_id)
);

create unique index if not exists user_preferences_username_lower_uidx
  on public.user_preferences (lower(username))
  where username is not null and length(trim(username)) > 0;

create index if not exists user_preferences_user_email_idx
  on public.user_preferences (lower(user_email));

create table if not exists public.tools_calculator (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  updated_at bigint,
  document jsonb not null default '{}'::jsonb,
  unique (user_id)
);

create table if not exists public.tools_college (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  updated_at bigint,
  document jsonb not null default '{}'::jsonb,
  unique (user_id)
);

create table if not exists public.tools_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  updated_at bigint,
  document jsonb not null default '{}'::jsonb,
  unique (user_id)
);

create table if not exists public.tools_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  updated_at bigint,
  document jsonb not null default '{}'::jsonb,
  unique (user_id)
);

create table if not exists public.tools_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  updated_at bigint,
  document jsonb not null default '{}'::jsonb,
  unique (user_id)
);

create table if not exists public.tools_stocks_workspace (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  updated_at bigint,
  document jsonb not null default '{}'::jsonb,
  unique (user_id)
);

create table if not exists public.tools_grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  period_system text,
  courses jsonb not null default '[]'::jsonb,
  updated_at bigint,
  unique (user_id)
);

create table if not exists public.tools_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  weekday jsonb,
  wednesday jsonb,
  recurring_blocks jsonb,
  template_a jsonb,
  template_b jsonb,
  use_ab_templates boolean,
  active_template text,
  day_type_override text,
  exceptions jsonb,
  updated_at bigint,
  unique (user_id)
);

create table if not exists public.tools_task (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  task_id text not null,
  title text not null,
  due text,
  priority text,
  class_name text,
  notes text,
  type text,
  estimated_minutes double precision,
  subtasks jsonb,
  recurrence_rule jsonb,
  recurrence_parent_id text,
  completed boolean default false,
  completed_at bigint,
  sort_order double precision,
  manual_sort_order double precision,
  created_at bigint,
  updated_at bigint,
  unique (user_id, task_id)
);

create index if not exists tools_task_user_id_idx on public.tools_task (user_id);
create index if not exists tools_task_completed_idx on public.tools_task (user_id, completed);

create table if not exists public.tools_calendar_event (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  event_id text not null,
  title text not null,
  start_at text not null,
  end_at text not null,
  all_day boolean,
  color text,
  repeat_rule text,
  repeat_interval_weeks double precision,
  repeat_days jsonb,
  instance_overrides jsonb,
  notes text,
  created_at bigint,
  updated_at bigint,
  unique (user_id, event_id)
);

create index if not exists tools_calendar_event_user_id_idx on public.tools_calendar_event (user_id);

create table if not exists public.tools_journal_entry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  date_key text not null,
  content text,
  mood text,
  tags jsonb,
  word_count double precision,
  comments jsonb,
  updated_at bigint,
  unique (user_id, date_key)
);

create index if not exists tools_journal_entry_user_date_idx
  on public.tools_journal_entry (user_id, date_key);

create table if not exists public.tools_focus_session (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  session_id text not null,
  started_at bigint not null,
  ended_at bigint,
  preset text,
  work_minutes double precision,
  break_minutes double precision,
  goal text,
  goal_achieved boolean,
  pause_count double precision,
  cycles_completed double precision,
  elapsed_seconds double precision,
  created_at bigint,
  unique (user_id, session_id)
);

create index if not exists tools_focus_session_user_id_idx on public.tools_focus_session (user_id);

create table if not exists public.tools_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  request_id text not null unique,
  type text not null,
  status text not null default 'new',
  user_email text not null,
  display_name text,
  subject text not null,
  message text not null,
  tool_id text,
  severity text,
  steps_to_reproduce text,
  expected_behavior text,
  actual_behavior text,
  page_url text,
  user_agent text,
  created_at bigint,
  updated_at bigint,
  admin_notes text
);

create index if not exists tools_feedback_user_id_idx on public.tools_feedback (user_id);
create index if not exists tools_feedback_status_idx on public.tools_feedback (status);
create index if not exists tools_feedback_created_at_idx on public.tools_feedback (created_at desc);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  actor_id text,
  action text not null,
  target_type text,
  target_id text,
  outcome text not null,
  request_id text not null,
  detail text,
  created_at bigint not null
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

-- ===========================================================================
-- 2) HELPER FUNCTIONS (tables exist now)
-- ===========================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

create or replace function public.is_username_available(desired text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when desired is null or length(trim(desired)) = 0 then false
    else not exists (
      select 1
      from public.user_preferences up
      where up.username is not null
        and lower(up.username) = lower(trim(desired))
    )
  end;
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon;
grant execute on function public.is_username_available(text) to authenticated;
grant execute on function public.is_username_available(text) to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    ),
    'user'
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = ((extract(epoch from now()) * 1000)::bigint);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- 3) ROW LEVEL SECURITY
-- ===========================================================================

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences_select_own" on public.user_preferences;
create policy "user_preferences_select_own"
  on public.user_preferences for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_preferences_insert_own" on public.user_preferences;
create policy "user_preferences_insert_own"
  on public.user_preferences for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own"
  on public.user_preferences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_preferences_delete_own" on public.user_preferences;
create policy "user_preferences_delete_own"
  on public.user_preferences for delete
  to authenticated
  using (user_id = auth.uid());

do $$
declare
  t text;
begin
  foreach t in array array[
    'tools_calculator',
    'tools_college',
    'tools_goals',
    'tools_lists',
    'tools_profile',
    'tools_stocks_workspace',
    'tools_grades',
    'tools_schedule',
    'tools_task',
    'tools_calendar_event',
    'tools_journal_entry',
    'tools_focus_session'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = auth.uid())',
      t || '_select_own', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid())',
      t || '_insert_own', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_update_own', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = auth.uid())',
      t || '_delete_own', t
    );
  end loop;
end $$;

alter table public.tools_feedback enable row level security;

drop policy if exists "tools_feedback_select_own_or_admin" on public.tools_feedback;
create policy "tools_feedback_select_own_or_admin"
  on public.tools_feedback for select
  to authenticated
  using (user_id = auth.uid() or user_email = (auth.jwt() ->> 'email') or public.is_admin());

drop policy if exists "tools_feedback_insert_own" on public.tools_feedback;
create policy "tools_feedback_insert_own"
  on public.tools_feedback for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or user_email = (auth.jwt() ->> 'email')
  );

drop policy if exists "tools_feedback_update_admin" on public.tools_feedback;
create policy "tools_feedback_update_admin"
  on public.tools_feedback for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "tools_feedback_delete_admin" on public.tools_feedback;
create policy "tools_feedback_delete_admin"
  on public.tools_feedback for delete
  to authenticated
  using (public.is_admin());

alter table public.admin_audit_log enable row level security;

drop policy if exists "admin_audit_log_select_admin" on public.admin_audit_log;
create policy "admin_audit_log_select_admin"
  on public.admin_audit_log for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admin_audit_log_insert_admin" on public.admin_audit_log;
create policy "admin_audit_log_insert_admin"
  on public.admin_audit_log for insert
  to authenticated
  with check (public.is_admin());

-- API roles need table privileges (RLS still applies). Without these,
-- PostgREST returns "permission denied for table …".
grant usage on schema public to postgres, anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

grant execute on all functions in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant execute on functions
  to anon, authenticated, service_role;

commit;

-- After Plan 04 signup (MANUAL C), promote yourself:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
