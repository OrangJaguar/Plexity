# Deploy Plexity on Vercel + Supabase

Production stack: **Vite SPA on Vercel** → **Supabase** (Auth, Postgres, Edge Functions).

## Vercel project

1. Import the GitHub repo in Vercel.
2. Framework: **Vite** (or rely on `vercel.json`).
3. Build command: `npm run build`
4. Output directory: `dist`
5. Node: **22+** (`package.json` engines)

## Environment variables (Vercel → Settings → Environment Variables)

Set for Production (and Preview if you want preview deploys to work):

| Variable | Value |
|----------|--------|
| `VITE_SUPABASE_URL` | Supabase Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → API → `anon` `public` key |
| `VITE_DATA_PROVIDER` | `supabase` |
| `VITE_CONVERTER_SERVER_FEATURES` | `false` |

Do **not** put `SUPABASE_SERVICE_ROLE_KEY` in Vercel. That key stays in Supabase Edge Function secrets only.

## Supabase Auth URLs

After the first deploy, copy the Vercel URL (e.g. `https://your-app.vercel.app`).

Supabase → Authentication → URL Configuration:

- **Site URL:** `https://your-app.vercel.app`
- **Redirect URLs:** include at least:
  - `https://your-app.vercel.app/**`
  - `https://your-app.vercel.app/reset-password`
  - (optional) `http://localhost:5173/**` for local dev

## Edge Functions (already in repo)

Functions live under `supabase/functions/`. Secrets are set in Supabase (Dashboard or CLI), not Vercel.

Expected functions: `tools-market-data`, `submit-feedback`, `admin-api`.

## Smoke checklist after deploy

- [ ] Sign up / confirm email / sign in
- [ ] Save data in one synced tool (e.g. tasks)
- [ ] Stocks quote loads (chart may be thin if Yahoo blocks cloud IPs)
- [ ] Submit feedback
- [ ] Admin user can open admin feedback
- [ ] Converter browser tools work; server URL-import / AI slots stay unavailable

## Optional

- Custom domain on Vercel → update Supabase Site URL + Redirect URLs
- Disable or archive the old Base44 app so it is not the live source of truth
