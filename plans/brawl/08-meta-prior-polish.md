# Plan 08 — Soft meta prior + polish + prototype freeze

## Goal

Lightweight tier prior from `/admin/brawledit` nudges draft scores without dominating; polish UX; prototype ready for ★ MANUAL C.

## Adjustments (delivered)

- Meta upload on **`/admin/brawledit`** (tiers + map pool + notes).
- Soft weight max ~12 via `metaBoostFromTier` — avoids stay hard-demoted.
- Ops notes: `docs/brawl-prototype.md` (no local proxy for end users once Edge is deployed).

## Acceptance / smoke (★ MANUAL C)

- [ ] Tag sync → fit → team gaps
- [ ] Solo draft + voice ban
- [ ] Trio invite + admin draft + viewer sees board
- [ ] Meta upload changes order slightly, does not override avoid/pocket extremes
- [ ] No hardcoded dependency on a fixed brawler roster in source (catalog fetched)

## Manual gate — ★ MANUAL C

Run the smoke checklist above. Report issues; agent fixes hot blockers.

## Status: DONE (awaiting ★ MANUAL C)
