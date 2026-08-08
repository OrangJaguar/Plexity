# Brawl Ranked prototype — ops notes

## Production (no local proxy)

End users do **not** need `npm run brawl:proxy`. Deploy the Supabase Edge Function `brawl-api` with secrets:

- `BRAWL_STARS_API_TOKEN`
- `BRAWL_STARS_API_BASE` (RoyaleAPI bsproxy, e.g. `https://bsproxy.royaleapi.dev/v1`)

Whitelist the Edge / proxy egress IP with the Brawl Stars developer portal as needed.

Locally, only use `VITE_BRAWL_PROXY_URL=http://127.0.0.1:8788` when developing without the Edge Function. Do **not** point the Vite env at bsproxy directly (CORS / token exposure).

## Admin vs tool routes

| Route | Purpose |
|--------|---------|
| `/brawl` | Player tool |
| `/admin/brawl` | Mirrored tool (admin chrome) — same board, future admin toggles |
| `/admin/brawledit` | Meta ops: weekly notes, map pool, soft tier prior |

## Map pool

1. Draft map dropdown = **active BrawlAPI maps for the selected mode** (`disabled: false`)
2. If `/admin/brawledit` weekly map pool names overlap that mode’s active set, the dropdown narrows to those
3. Official `/events/rotation` is ladder slots — not Mythic ranked pool (Supercell doesn’t expose a ranked-only list)

## Soft tier prior

Upload JSON or `Name, score` lines on `/admin/brawledit`. Scores nudge suggestions by at most ~12 points; avoids/pockets still dominate.

## Realtime trio board

Enable replication for `brawl_draft_sessions` in Supabase Realtime if viewers do not see live updates.
