# Plan 03 — Brawl Stars API proxy + live catalog

## Goal

All official API traffic goes through a **server proxy** (API token never in the browser). Catalog/art comes from **BrawlAPI** (or official `/brawlers`) so we never hardcode brawler/map lists.

## Adjustments (from progress)

- Edge Function name: `brawl-api` (matches `tools-market-data` style) + `invokeBackendFunction('brawlApi')`.
- **Local proxy** `npm run brawl:proxy` for IP whitelist during prototype (bind `127.0.0.1:8788`); optional `VITE_BRAWL_PROXY_URL`.
- BrawlAPI catalog fetched **from the browser** (CORS open) for icons/names/maps.
- Tag helpers shared; reject illegal tag characters early.

## Achievements

- [x] `supabase/functions/brawl-api` (JWT required, cached upstream)
- [x] Client: `src/api/brawl/*`
- [x] Local proxy script + `brawl:proxy` npm script
- [x] `.env.example` + README MANUAL B notes
- [x] Unit tests for tags / catalog normalize

## Manual gate after this plan — ★ MANUAL B

**Do not put the IP in Supabase secrets.** Secrets get the **API token string** only.  
IP `45.79.218.79` is only for the **whitelist on the token** at developer.brawlstars.com (RoyaleAPI proxy).

1. [developer.brawlstars.com](https://developer.brawlstars.com) → create/edit key → allowed IP: **`45.79.218.79`** (no `https://`)
2. Copy the **token** (long JWT-looking string)
3. Local `.env`:
   ```bash
   BRAWL_STARS_API_TOKEN=paste_token_here
   VITE_BRAWL_PROXY_URL=http://127.0.0.1:8788
   ```
4. `npm run brawl:proxy` then curl smoke with your player tag
5. Supabase secrets (token only) + deploy:
   ```bash
   supabase secrets set BRAWL_STARS_API_TOKEN=paste_token_here
   supabase secrets set BRAWL_STARS_API_BASE=https://bsproxy.royaleapi.dev/v1
   supabase functions deploy brawl-api
   ```
6. Reply: **Brawl MANUAL B done**

Default upstream is already `https://bsproxy.royaleapi.dev/v1` ([RoyaleAPI proxy docs](https://docs.royaleapi.com/proxy.html)).

## Status: DONE — waiting on ★ MANUAL B
