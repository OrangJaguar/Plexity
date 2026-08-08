# Plan 06 — Draft board (Solo + Trio)

## Goal

Working Ranked draft: fast tap UX, Mythic+ P11 legality, scoring dominated by **synergy + fit + counters**, soft meta prior from `/admin/brawledit` map pool when present.

## Adjustments (from progress)

- Admin meta ops live at **`/admin/brawledit`** (not `/admin/brawl`, which is the mirrored tool).
- Map select prefers weekly map pool from admin meta; else BrawlAPI map names.
- Production: **Supabase Edge `brawl-api` + RoyaleAPI bsproxy** — no local `brawl:proxy` needed for end users once secrets are set and the function is deployed. Local proxy is only for your machine when developing without the Edge Function.
- Soft meta tier weights optional (Plan 08 polish); map pool wired now.

## Delivered

- `draft-roles.js` / `draft-score.js` — mode budgets, tag seeds, candidate scoring
- `draftSession.js` — solo upsert + trio admin-only upsert + Realtime subscribe
- `BrawlDraftBoard.jsx` — mode/map, bans, our/enemy picks, P11 suggestions; wired in `BrawlContent`

## Scoring (prototype)

```text
hard: P11 + owned + not banned/picked
score = role_fit + synergy + counter + player_fit - avoid
```

## Acceptance

- [x] Solo ban/pick loop
- [x] Trio shared session + admin-only write + Realtime view
- [x] Suggestions respect P11 / ownership
- [x] Client-side rescore

## Manual gate

None for code. For **production** (no local proxy): deploy `brawl-api` + set `BRAWL_STARS_API_TOKEN` (+ base) secrets if not already. Enable Realtime on `brawl_draft_sessions` if not already (Plan 02).

## Status: DONE
