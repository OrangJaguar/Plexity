# Plan 03 — Data access adapter (entities → Supabase)

## Goal

Make all tool data CRUD go through Supabase when `VITE_DATA_PROVIDER=supabase`, without rewriting every tool page. Keep Base44 path until the flag flips.

## Adjustments

- Fresh DB only — no Base44 data import.
- Added `src/api/entities/supabaseMap.js` for entity→table + camelCase↔snake_case (+ `start`/`end` → `start_at`/`end_at`).
- Minimal **`requireAuth` Supabase branch** (session + `profiles.role`) so adapters can set `user_id` before Plan 04 AuthForm cutover.
- Feedback submit/admin still Base44 invokes until Plan 05.
- Strip client-generated `id` on insert (task/event use `task_id` / `event_id`; DB `id` is uuid).

## Achievements

- [x] Supabase-backed list/filter/create/update/delete in `toolsApi.js`
- [x] Entity → table map + row shape mapping
- [x] Preferences helpers on Supabase (+ `is_username_available` RPC)
- [x] Base44 path unchanged when flag is `base44`
- [x] Mapping unit tests

## Acceptance

- [x] Default `base44` path preserved in code
- [x] Supabase path ready (full E2E after Plan 04 + flag flip)
- [x] No converter DB calls

## Manual gate

**None before Plan 04.** Do **not** flip `VITE_DATA_PROVIDER=supabase` yet — AuthForm still talks to Base44 until Plan 04.

## How to confirm (after Plan 04 + MANUAL C)

1. `.env`: `VITE_DATA_PROVIDER=supabase` → restart `npm run dev`
2. Sign in → Tasks → create a task
3. Supabase Table Editor → `tools_task` shows the row
4. Optional: change a preference → row in `user_preferences`

## Status: **COMPLETE** — continue to Plan 04 when ready

## Out of scope

- AuthForm / full session UX (Plan 04)
- Edge functions (Plan 05)
