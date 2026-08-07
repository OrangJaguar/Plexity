# Plexity: Base44 → Vercel + Supabase (Skip Converter Backends)

## Goal

Get the app live on **Vercel** with **Supabase** (Auth + Postgres + Edge Functions), preserving ~95% of product value.

**Explicitly out of scope for this migration:**

- `adminConverterApi` / `adminConverterAiApi` (~2k LOC Deno)
- AdminConverter* database tables
- HMAC / converter-media control-plane rewiring
- Migrating existing Base44 production user data (fresh Supabase DB; users re-sign up — Base44 data is being wiped)

**Still in scope (client-side):**

- Converter / video / image / PDF tools that run in the browser stay
- Server-backed converter features (authorized URL import, AI OCR/transcribe via control service) get **disabled or stubbed** with a clear unavailable state

## Plan sequence (7 plans)

| # | File | Focus | Agent vs you |
|---|------|--------|--------------|
| 01 | `01-scaffold.md` | Supabase client, env, provider flag, Vercel-ready Vite (**DONE**) | Agent code |
| 02 | `02-schema.md` | SQL migrations for user/tools/feedback/audit + RLS (**DONE** — run SQL) | Agent wrote SQL; **you run it** |
| 03 | `03-data-adapter.md` | `toolsApi` / preferences → Supabase (**DONE**) | Agent code |
| 04 | `04-auth.md` | AuthForm, session, admin role, password flows (**DONE** — flip flag) | Agent code; **you set admin** |
| 05 | `05-backend-functions.md` | market data + feedback + admin API as Edge Functions (**DONE** — deploy) | Agent code; **you deploy + secrets** |
| 06 | `06-disable-converter-backends.md` | Soft-disable server converter; remove Base44 SDK (**DONE**) | Agent code |
| 07 | `07-vercel-ship.md` | `vercel.json`, env docs, production cutover checklist (**agent DONE** — deploy) | Agent config; **you create Vercel project** |

## How we work each plan

1. You say: *based on edits so far, adjust the next plan if needed, then execute*
2. Agent may tweak that plan file from learnings, then implements it
3. Agent stops at the **manual gate** listed in the plan
4. You do the manual steps, then say go for the next plan

## Manual gates (where you do stuff)

```
[start]
   │
   ▼
 Plan 01 ─── agent only (scaffold)
   │
   ▼
 ★ MANUAL A — Create Supabase project, copy URL + anon + service_role keys into local .env
   │
   ▼
 Plan 02 ─── agent writes SQL
   │
   ▼
 ★ MANUAL B — Run SQL in Supabase SQL Editor; confirm Auth email provider settings
   │
   ▼
 Plans 03–04 ─── agent (data + auth)
   │
   ▼
 ★ MANUAL C — Sign up once locally; set your user role=admin in Supabase; flip flag to supabase; smoke login
   │
   ▼
 Plan 05 ─── agent ports 3 functions
   │
   ▼
 ★ MANUAL D — Deploy Edge Functions; set function secrets; smoke stocks + feedback + admin feedback
   │
   ▼
 Plan 06 ─── agent DONE (disable converter backends, strip Base44)
   │
   ▼
 Plan 07 ─── agent DONE (vercel.json + env template)
   │
   ▼
 ★ MANUAL E — Create Vercel project, set env vars, deploy, point domain; confirm prod works
[done]
```

## What “95% done” looks like

- Landing, auth (sign up / in / out / reset), admin gate
- All tools that sync user data (tasks, journal, grades, schedule, stocks workspace prefs, etc.)
- Stocks market data proxy
- Feedback submit + admin feedback management
- Browser-local tools (passwords vault, calculator, PDF, image, video, client converter)
- Live on Vercel talking only to Supabase

## Deferred (later migration wave)

- Converter URL import + AI assist backends
- Bulk data import from Base44
- `services/converter-media` callback retarget
