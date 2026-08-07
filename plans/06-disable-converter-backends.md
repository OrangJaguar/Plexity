# Plan 06 — Disable converter backends + strip Base44

## Goal

Ship without server-side converter features, and remove Base44 as a runtime dependency so the app is Vercel-clean.

## Adjustments (from migration progress)

- App is already on `VITE_DATA_PROVIDER=supabase` in prod path — **default provider → supabase**; remove dual Base44 runtime.
- Keep `base44/` folder in repo as legacy reference only (not imported).
- Stocks Yahoo fundamentals remain degraded (cloud IP) — out of scope here.
- `VITE_CONVERTER_SERVER_FEATURES` defaults **false**.

## Achievements

- [x] Converter URL/AI APIs short-circuit; UI slots gated
- [x] Soft-fail analytics / logAppError
- [x] Remove `@base44/sdk` + `@base44/vite-plugin`
- [x] Supabase-only auth/data/functions clients
- [x] Legal copy updated off Base44
- [x] AuthForm email-link signup only (no Base44 OTP)
- [x] Production build without Base44 plugin

## Manual gate

None before Plan 07.

## Status: DONE
