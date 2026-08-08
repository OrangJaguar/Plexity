# Plan 02 — Schema + RLS

## Goal

Persist Brawl player link, trio membership, invites, pockets/avoids, soft meta priors, and draft sessions with RLS matching existing Plexity patterns (`user_id`, grants, bigint ms timestamps).

## Adjustments (from Plan 01 + existing SQL)

- One migration file: `supabase/migrations/0003_brawl.sql` (tables → helpers → RLS → grants).
- Prototype: **one trio per user** (`unique` on `brawl_trio_members.user_id`).
- Draft: solo sessions owned by user; trio sessions writable only by trio **admin**.
- Realtime: document enabling `brawl_draft_sessions` (+ invites) in Dashboard if not auto.
- No hardcoded brawler catalogs in SQL — only integer `brawler_id` + jsonb caches from API later.

## Tables

See `0003_brawl.sql`.

## Acceptance

- [x] SQL written
- [x] Matches auth.users / profiles patterns + grants

## Manual gate after this plan — ★ MANUAL A

1. Open Supabase SQL Editor
2. Run **entire** `supabase/migrations/0003_brawl.sql` once
3. Confirm tables exist under Table Editor
4. Database → Replication / Realtime: enable `brawl_draft_sessions` (and optionally `brawl_trio_invites`)

## Status: DONE — waiting on ★ MANUAL A
