-- Trio members can read each other's roster (P11 legality for ready swaps / seat suggestions).
-- Run in Supabase SQL Editor after 0003_brawl.sql.

drop policy if exists brawl_roster_brawlers_select_trio_mates on public.brawl_roster_brawlers;
create policy brawl_roster_brawlers_select_trio_mates on public.brawl_roster_brawlers
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.brawl_trio_members me
      join public.brawl_trio_members them
        on them.trio_id = me.trio_id
      where me.user_id = auth.uid()
        and them.user_id = brawl_roster_brawlers.user_id
    )
  );
