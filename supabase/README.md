# Supabase (Plexity)

Schema for the Base44 → Vercel + Supabase migration. Converter server tables are **not** included. Fresh DB only — no Base44 data import.

## ★ MANUAL B — run the migration

1. Open your project at [supabase.com](https://supabase.com) → **SQL Editor**
2. Open [`migrations/0001_init.sql`](./migrations/0001_init.sql) in this repo (**reload the file** — it was fixed after the `profiles does not exist` error)
3. Copy **all** of it into the SQL Editor → **Run** (one shot; do not run partial snippets)
4. If a previous failed run left nothing useful, that is fine — this script uses `if not exists` / `drop policy if exists` and is safe to re-run
5. Open **Table Editor** and confirm tables exist, including:
   - `profiles`
   - `user_preferences`
   - `tools_task`, `tools_journal_entry`, `tools_feedback`
   - `admin_audit_log`
6. **Authentication → Providers** → enable **Email** (password sign-in)
7. Reply to the agent: **MANUAL B done**

Optional CLI (if you use Supabase CLI later):

```bash
supabase link --project-ref <your-ref>
supabase db push
```

## ★ MANUAL D — deploy Edge Functions (Plan 05)

From the repo root (after `supabase login` + `supabase link --project-ref <ref>`):

```bash
supabase functions deploy tools-market-data
supabase functions deploy submit-feedback
supabase functions deploy admin-api
```

Optional:

```bash
supabase secrets set APP_NAME=Plexity APP_VERSION=1 APP_CONTACT_URL="http://localhost:5173"
```

Smoke: stocks search, `/feedback`, `/admin/feedback`.

## ★ If tools won't save (permission denied)

If tasks/prefs never appear in Table Editor, run [`migrations/0002_table_grants.sql`](./migrations/0002_table_grants.sql) in the SQL Editor.  
Cause: `0001_init` created tables + RLS but initially omitted `GRANT`s to `authenticated` / `anon` / `service_role`.

## ★ MANUAL C — flip to Supabase auth (after Plan 04)

1. In local `.env` set:
   ```bash
   VITE_DATA_PROVIDER=supabase
   ```
   (URL + anon key should already be set from MANUAL A)
2. Restart `npm run dev`
3. Sign up at `/signup` (confirm email if required, then sign in)
4. Promote yourself to admin in SQL Editor:
   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'YOUR_EMAIL@example.com';
   ```
5. Refresh the app — `/admin/feedback` should be reachable (admin API still Base44 until Plan 05, so that page may error until then)
6. Smoke: create a task → Table Editor → `tools_task`
7. Reply to the agent: **MANUAL C done**

## Design notes (for Plan 03 adapter)

| Choice | Detail |
|--------|--------|
| Owner key | `user_id` (uuid) + denormalized `user_email` |
| Timestamps | `bigint` epoch **milliseconds** |
| Admin | `profiles.role = 'admin'`; helper `is_admin()` |
| Username check | RPC `is_username_available(desired text)` |
| Calendar columns | SQL uses `start_at` / `end_at` (Base44 `start` / `end`) |
| Task column | SQL uses `class_name` (Base44 `className`) |
| Preferences | snake_case columns ↔ camelCase client fields |

## ★ MANUAL C preview (after Plan 04 signup)

```sql
update public.profiles
set role = 'admin'
where email = 'YOUR_EMAIL@example.com';
```

## Secrets

- Browser: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Server / Edge only: `SUPABASE_SERVICE_ROLE_KEY` (never `VITE_`)

## ★ Brawl MANUAL — trio roster read (Plan 13 ready swaps)

After `0003_brawl.sql`, run [`migrations/0004_brawl_trio_roster_read.sql`](./migrations/0004_brawl_trio_roster_read.sql) so trio members can read each other’s P11 roster for legal ready-phase swaps.

## ★ Brawl MANUAL B — API token + proxy (Plan 03)

Official docs: https://developer.brawlstars.com/#/documentation

1. Create/copy an API token; **whitelist** the IP that will call Supercell
   - Local smoke: whitelist your home public IP and run `npm run brawl:proxy`
   - Edge Function: whitelist is harder (dynamic egress) — use local proxy for prototype, or a static-IP host later
2. Put the token in **server** env only (never `VITE_`):
   ```bash
   # local .env
   BRAWL_STARS_API_TOKEN=your_token_here
   # optional while using local proxy
   VITE_BRAWL_PROXY_URL=http://127.0.0.1:8788
   ```
   ```bash
   supabase secrets set BRAWL_STARS_API_TOKEN=your_token_here
   supabase functions deploy brawl-api
   ```
3. Smoke (with proxy running + token set):
   ```bash
   curl -s -X POST http://127.0.0.1:8788/brawl-api \
     -H "Content-Type: application/json" \
     -d "{\"action\":\"getPlayer\",\"playerTag\":\"YOURTAG\"}"
   ```
4. Reply to the agent: **Brawl MANUAL B done**
