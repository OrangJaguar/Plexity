# Plan 05 — Fit engine + Team tools

## Goal

Compute **advanced fit** without a role questionnaire, and ship **Team tools** that use roster + fit.

## Adjustments (from Plan 04 feedback)

- Catalog: **official** `/brawlers` IDs + BrawlAPI portraits; A–Z; show **all** (no 40-cap).
- Portraits in pockets/team UI via `imageUrl`.
- **`/admin/brawledit`** ops page for weekly notes + season map pool (feeds Plan 06). `/admin/brawl` stays the mirrored tool route.
- Sync recomputes `brawl_fit_cache` automatically.

## Achievements

- [x] Fit engine + tests (`fit-engine.js`)
- [x] Persist fit on sync; pockets/avoids affect scores
- [x] Team tools: readiness, roster-by-fit, upgrade next, shared queue
- [x] Admin Brawl ops page + nav link
- [x] Catalog/portrait fixes

## Manual gate

None. Keep `npm run brawl:proxy` running for sync/catalog official fetch.

## Status: DONE
