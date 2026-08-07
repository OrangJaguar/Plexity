# Plan 05 — Backend functions (market + feedback + admin)

## Goal

Replace the three **non-converter** Base44 functions with Supabase Edge Functions. Client invoke retargeted when `VITE_DATA_PROVIDER=supabase`.

## Adjustments

- Shared helpers under `supabase/functions/_shared/` (CORS, auth, case).
- Client uses `src/api/functions/invoke.js` (maps Base44 names → Edge slugs).
- Admin role from `profiles.role` (already set in MANUAL C).
- Table GRANTs from `0002_table_grants.sql` required (already applied).
- Converter functions still Base44/disabled — untouched here.

## Functions

| Base44 | Edge slug | Status |
|--------|-----------|--------|
| toolsMarketData | `tools-market-data` | Ported |
| submitFeedback | `submit-feedback` | Ported |
| adminApi | `admin-api` | Ported |

## Achievements

- [x] Edge function sources written
- [x] Client wrappers retargeted
- [x] `supabase/config.toml` with verify_jwt
- [ ] Deployed + smoked (MANUAL D)

## Status: **COMPLETE (code)** — waiting on ★ MANUAL D

## ★ MANUAL D — deploy functions

1. Install CLI if needed: `npm i -g supabase` (or use Homebrew)
2. Login + link (project ref is the subdomain of your URL, e.g. `hngyskjghuuytalqjjoe`):
   ```bash
   supabase login
   cd /Users/SANSG/Desktop/Plexity
   supabase link --project-ref YOUR_PROJECT_REF
   ```
3. Deploy all three:
   ```bash
   supabase functions deploy tools-market-data
   supabase functions deploy submit-feedback
   supabase functions deploy admin-api
   ```
4. Optional secrets (market data User-Agent):
   ```bash
   supabase secrets set APP_NAME=Plexity APP_VERSION=1 APP_CONTACT_URL="https://your-vercel-or-local-url"
   ```
   (`SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)
5. Smoke (app already on `VITE_DATA_PROVIDER=supabase`):
   - Stocks tool — search a ticker
   - `/feedback` — submit a note → row in `tools_feedback`
   - `/admin/feedback` — see + update status
6. Tell agent: **MANUAL D done — execute Plan 06**

## Out of scope

- Converter backends
- Vercel (Plan 07)
