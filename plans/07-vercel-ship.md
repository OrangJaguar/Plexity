# Plan 07 — Vercel ship + production cutover

## Goal

Make the repo one-click deployable on Vercel and leave a clear cutover checklist for you.

## Adjustments (from Plans 01–06)

- Base44 SDK/plugin already removed; provider is Supabase-only.
- Converter server features flagged off (`VITE_CONVERTER_SERVER_FEATURES=false`).
- Edge Functions already deployed under Supabase — no Vercel serverless needed for those.
- Node `engines`: `>=22` (match Vercel Node 22).

## Achievements (agent)

- [x] `vercel.json` for Vite SPA (build, `dist`, SPA rewrite)
- [x] `.env.example` production Vite vars only (no service role / no Base44)
- [x] `docs/deploy-vercel-supabase.md` cutover checklist
- [x] Final pass: `npm run build` without Base44

## Env vars to set on Vercel (Vite)

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_DATA_PROVIDER=supabase
VITE_CONVERTER_SERVER_FEATURES=false
```

Edge function secrets stay in **Supabase**, not Vercel.

## Acceptance

- [x] `vercel.json` present and correct
- [x] Deploy docs list every manual click
- [x] `npm run build` succeeds locally with Supabase env

## Manual gate after this plan — YOU SHIP

**★ MANUAL E:**

1. Push branch / main to GitHub (when you are ready)
2. Vercel → New Project → import repo
3. Framework preset: Vite; build `npm run build`; output `dist`
4. Add env vars listed above
5. Deploy
6. Supabase Auth → URL config:
   - Site URL = your Vercel URL
   - Redirect URLs include `https://your-app.vercel.app/**` and reset-password path
7. Re-test: sign up/in, one tool save, stocks, feedback, admin
8. Optional: custom domain on Vercel + update Supabase Auth URLs
9. Optional: freeze/disable Base44 app so it is not the live source of truth

Full checklist: [`docs/deploy-vercel-supabase.md`](../docs/deploy-vercel-supabase.md)

## Done criteria

App is live on Vercel, auth/data/functions on Supabase, converter server features off, core tools working.

## Status: agent work complete — waiting on MANUAL E
