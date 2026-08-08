# Plan 04 — Settings: player, trio, pockets/avoids

## Goal

Settings gets a proper **Brawl** block with everything the player needs. No draft yet.

## Adjustments (from MANUAL B)

- Live player fetch works via RoyaleAPI `bsproxy` + token.
- Fixed mis-set `VITE_BRAWL_PROXY_URL` (must be local `http://127.0.0.1:8788`, not bsproxy).
- Client ignores RoyaleAPI URLs in `VITE_BRAWL_PROXY_URL` and falls back to Edge Function.
- Fit recompute deferred to Plan 05 — sync writes roster + player link only.

## Achievements

- [x] `BrawlSettingsPanel` in Settings → Brawl
- [x] Tag save + Sync → `brawl_player_links` + `brawl_roster_brawlers`
- [x] Pockets / avoids (catalog search, cap 8)
- [x] Trio create / invite / join / nickname / transfer admin / leave / kick

## Manual gate

None.

## Status: DONE

**Note:** For Sync in the app, keep `npm run brawl:proxy` running (or deploy `brawl-api` Edge Function with secrets).
