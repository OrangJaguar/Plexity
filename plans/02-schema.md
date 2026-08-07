# Plan 02 — Postgres schema + RLS (no converter tables)

## Goal

Produce runnable SQL that recreates the **user/tools/admin-feedback** data model in Supabase. Skip all `AdminConverter*` entities.

## Adjustments (from Plan 01 + entity review + SQL Editor fix)

- Use a **`profiles`** table with `role text` (`user` | `admin`) — Plan 04 / MANUAL C set admin via SQL on this table.
- Owner key: **`user_id uuid` → `auth.users(id)`**; also store **`user_email`** for adapter parity with current Base44 client shapes.
- Timestamps: **`bigint` epoch ms** (matches `Date.now()` in the app).
- Document tools: `document jsonb` + `updated_at bigint`.
- Preferences: wide snake_case columns (not one blob) so partial patches stay easy in Plan 03.
- Username checks: unique index + `is_username_available()` SECURITY DEFINER RPC.
- Admin helper: `is_admin()` reads `profiles.role`.
- Auto-create `profiles` row on `auth.users` insert.
- **No AdminConverter* tables.**
- **SQL order fixed:** create all tables **before** `is_admin` / `is_username_available` (Postgres `LANGUAGE sql` resolves relations at create time — caused `42P01 profiles does not exist`).
- **No Base44 data migration** — fresh Supabase DB; Base44 users/data being wiped.

## Tables

| Table | Notes |
|-------|--------|
| `profiles` | `id`, `email`, `role`, `full_name`, timestamps |
| `user_preferences` | From UserPreferences |
| `tools_calculator` … `tools_stocks_workspace` | 1 row/user, `document` jsonb |
| `tools_grades` | structured |
| `tools_schedule` | structured |
| `tools_task` | multi-row |
| `tools_calendar_event` | multi-row |
| `tools_journal_entry` | multi-row, unique `(user_id, date_key)` |
| `tools_focus_session` | multi-row |
| `tools_feedback` | user create/read own; admin update/all |
| `admin_audit_log` | admin read; insert via service role / edge (Plan 05) |

## Deliverables

- [x] `supabase/migrations/0001_init.sql`
- [x] `supabase/README.md`

## Acceptance

- [x] SQL complete and self-contained
- [x] Converter tables absent
- [x] RLS on all tables
- [x] Admin set instructions for MANUAL C documented in README

## Status: **COMPLETE** — waiting on ★ MANUAL B

## Manual gate after this plan

**★ MANUAL B:**

1. Open Supabase → **SQL Editor**
2. Paste and run the entire contents of `supabase/migrations/0001_init.sql`
3. Confirm tables under **Table Editor** (e.g. `profiles`, `user_preferences`, `tools_task`, …)
4. **Authentication → Providers**: ensure **Email** is enabled
5. Tell agent MANUAL B done → Plan 03

## Out of scope

- Frontend entity clients (Plan 03)
- Auth UI (Plan 04)
