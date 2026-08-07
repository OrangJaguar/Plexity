# Plan 01 — Scaffold Supabase client + dual provider

## Goal

Add Supabase beside Base44 without breaking the current app. Local `npm run dev` still works on Base44 until we flip a flag later.

## Adjustments (from codebase review + execution)

- Gate `@base44/vite-plugin` with **`DISABLE_BASE44_VITE_PLUGIN=true`** (not the data-provider flag). Local Base44 preview still wants the plugin; Vercel builds set the disable flag.
- **Own the `@` alias in `vite.config.js`** — Base44’s plugin was providing it; without that, gated builds fail to resolve `@/App`.
- **Lazy-init** the Supabase browser client so missing `VITE_SUPABASE_*` does not crash Base44-only mode.
- Keep Base44 `app-params` / `base44_*` localStorage keys untouched; add a separate Supabase params export.
- Provider helpers only — **no** auth/entity call-site rewrites in this plan.
- Full `vite build` takes ~1–2 min (huge onnx/ffmpeg chunks). Do not pipe to `tail` while waiting — it hides progress. Kill duplicate build processes if one hangs.

## Achievements

- [x] Install `@supabase/supabase-js` (^2.112.2)
- [x] Add env vars to `.env.example`
- [x] Create `src/api/supabaseClient.js` (lazy browser anon client)
- [x] Create `src/api/provider.js` + `src/api/provider.test.js` (3 tests passing)
- [x] Extend `src/lib/app-params.js` with `supabaseParams`
- [x] Gate Base44 vite plugin + add explicit `@` → `src` alias
- [x] Verified: `DISABLE_BASE44_VITE_PLUGIN=true npx vite build` → **✓ built in ~1m 30s**

## Code touchpoints

- `package.json` / lockfile
- `.env.example`
- `src/api/supabaseClient.js` (new)
- `src/api/provider.js` (new)
- `src/api/provider.test.js` (new)
- `vite.config.js`
- `src/lib/app-params.js`

## Acceptance

- [x] App still runs with existing Base44 `.env` (dev server was left running)
- [x] Supabase client module present; lazy init when keys set
- [x] No user-facing behavior change yet (`VITE_DATA_PROVIDER` defaults to `base44`)
- [x] Gated production build succeeds without Base44 vite plugin

## Status: **COMPLETE** — waiting on ★ MANUAL A

## Manual gate after this plan

**★ MANUAL A** (before Plan 02):

1. Create a Supabase project at https://supabase.com
2. Project Settings → API: copy **Project URL**, **anon public** key, **service_role** key
3. Put into local `.env` (do not commit service_role):

```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
# Keep for Plan 05 — never expose to Vite / never commit:
SUPABASE_SERVICE_ROLE_KEY=eyJ...
VITE_DATA_PROVIDER=base44
```

4. Tell the agent MANUAL A is done → proceed to Plan 02

## Out of scope

- Schema, auth UI changes, function ports
