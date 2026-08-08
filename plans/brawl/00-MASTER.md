# Plexity Brawl — Doctrine Revamp (Master)

## Goal

Take the working prototype and rebuild it to match **your Q&A answers** + the **Ranked draft research report**, so the tool feels like a Mythic+ coach — not a shallow pocket recommender.

Source locks:

- [`QUESTIONS-for-you-ranked-draft.md`](./QUESTIONS-for-you-ranked-draft.md) (answered)
- Research PDF (draft flow, bans, A1/B3 doctrine, loadouts, swaps)
- [`09-draft-doctrine.md`](./09-draft-doctrine.md)

## What “done” means

- Ranked map dropdowns = **only** admin-curated pools per mode  
- Lobby: mode → map → coin → party leader (trio) / your seat (solo) → auto Elo order  
- Pick sequence A1→B1→B2→A2→A3→B3 with step-aware suggestions  
- Per-player suggestion slider; mild pockets/avoids; grey P11-upgrade hints  
- Voice: hold Space, edit, Enter (admin-only in trio)  
- Simple ban entry (voice dump OK — no fancy blind UI)  
- Loadout hints as picks land; ready-phase swap proposals (dual confirm)  
- Team tools still useful between games  

## Plan sequence (this revamp)

| # | File | Focus | Gate |
|---|------|--------|------|
| 10 | `10-admin-pool-nav.md` | Admin save + curated maps only + nav slider | **DONE** |
| 11 | `11-lobby-protocol.md` | Captain/Elo seats, timeline, ban simplicity, sync | **DONE** |
| 12 | `12-suggestion-intelligence.md` | Step scoring, counters, per-player slider, skill scaling | **DONE** |
| 13 | `13-loadouts-ready-swaps.md` | Gadget/SP/gear hints + 17s ready swaps | **DONE** |
| 14 | `14-team-voice-polish.md` | Team panel polish, voice phrases, empty states | **DONE** |
| 15 | `15-draft-arena.md` | In-game arena layout + chrome collapse + peek recs | **DONE** — live smoke |

## How we work

1. You: *adjust next plan if needed, then execute*  
2. Agent implements that plan only  
3. Stop at manual gates  
4. You verify, then say go for the next  

## Do not regress

- No local proxy required for end users (Edge `brawl-api`)  
- `/admin/brawledit` ≠ `/admin/brawl`  
- App admin ≠ in-game party leader  
- P11-only legal picks  
- No LLM in draft hot path  

## Status

Plans 01–09 = prototype foundation.  
**Revamp: Plans 10–14 DONE. Plan 15 arena rewrite DONE. Gate: ★ MANUAL D / live arena smoke.**
