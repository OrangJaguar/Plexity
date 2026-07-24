# Plan 6 — Playlists & Packages

Builds on Plan 5 ([admin-converter-url-import.md](./admin-converter-url-import.md)).

## Capabilities (UI kill switches)

| Key | Purpose |
|-----|---------|
| `converter.url.import` | Plan 5 single/multi URL import |
| `converter.playlist.import` | Playlist/channel/feed discovery + selection |
| `converter.package.create` | Server ZIP packages |

Public converter capabilities remain empty.

## Service kill switches

| Env | Default | Purpose |
|-----|---------|---------|
| `ACCEPT_NEW_JOBS` | true | Reject creates while draining |
| `ENABLE_YOUTUBE_CONNECTOR` | false | Gates single-video **and** playlist/channel discovery/fetch |
| `ENABLE_FEED_CONNECTOR` | true | Gates RSS/Atom enclosure discovery |

YouTube playlist/channel discovery requires **both** `converter.playlist.import` (UI) and `ENABLE_YOUTUBE_CONNECTOR=true` (service).

## Quotas

- Discover up to 200 items
- Select/process up to 50 items per confirm
- Package hard cap 4 GiB; warn 2 GiB desktop / 500 MiB mobile
- Package retention 60 min; signed links 5 min

## Deploy order

1. Postgres migration (discoveries/packages tables)
2. Deploy discovery-worker + package-worker with `ACCEPT_NEW_JOBS=false`
3. Deploy updated `adminConverterApi`
4. Deploy frontend (capabilities may be true in code)
5. Enable `ACCEPT_NEW_JOBS=true`; smoke playlist with YouTube connector on
6. Smoke package create/download + cleanup
7. Enable feed connector smoke

## Rollback

1. Disable `converter.playlist.import` and/or `converter.package.create`
2. Disable `ENABLE_YOUTUBE_CONNECTOR` / `ENABLE_FEED_CONNECTOR` as needed
3. Set `ACCEPT_NEW_JOBS=false`
4. Let jobs/packages drain until TTL; cleanup continues
