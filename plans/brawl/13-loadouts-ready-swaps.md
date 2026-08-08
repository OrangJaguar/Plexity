# Plan 13 — Loadouts + ready-phase swaps

## Goal

After picks start (esp. full draft), coach gadgets / SP / gears; support ~17s ready swaps on our side.

## Delivered

- [x] Loadout hints from first enemy/our pick (seeds + matchup flip, e.g. Piper vs dive)
- [x] Ownership warn chips (missing gadget/SP/gears) — soft, not hard block
- [x] Gear defaults Shield+Damage; Vision on bushy modes; Health on tanks
- [x] Catalog enriched with BrawlAPI gadget/SP names
- [x] Ready phase when 6 picks locked
- [x] Propose our-side P11↔P11 swaps; admin-recorded dual confirm → apply
- [x] Migration `0004_brawl_trio_roster_read.sql` for mate roster SELECT

## Manual

1. Run `supabase/migrations/0004_brawl_trio_roster_read.sql` in Supabase
2. Smoke: lock Piper, add dive enemy → gadget flips; full draft → propose/confirm/apply swap

## Status: DONE
