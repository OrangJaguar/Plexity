# Plan 5 — Admin Converter Secure URL secrets & deploy

Operator details for the Docker media service live in
[`services/converter-media/README.md`](../../services/converter-media/README.md).

## Base44 function secrets (`adminConverterApi`)

| Secret | Purpose |
|--------|---------|
| `CONVERTER_MEDIA_CONTROL_URL` | Base URL of the Docker control API (e.g. `https://media.internal:8080`) |
| `CONVERTER_MEDIA_HMAC_SECRET` | Shared HMAC secret for Base44 → control API requests |
| `CONVERTER_MEDIA_CALLBACK_HMAC_SECRET` | Optional separate secret for worker → Base44 callbacks (falls back to HMAC secret) |
| `ACCEPT_NEW_JOBS` | Kill switch: set `false` to reject new creates while draining |
| `ENABLE_YOUTUBE_CONNECTOR` | Kill switch: set `true` only after accepting YouTube Terms risk |

Never put these in `VITE_*` frontend env vars.

## Plan 6

See [admin-converter-playlists-packages.md](./admin-converter-playlists-packages.md) for playlist/package capabilities, `ENABLE_FEED_CONNECTOR`, quotas, and deploy/rollback.

## Capability kill switch

UI exposure is controlled by `converter.url.import` in
`ADMIN_TOOL_CAPABILITY_DELTAS` ([`src/lib/tools/tool-capabilities.js`](../../src/lib/tools/tool-capabilities.js)).
Removing or setting that key false hides the Authorized URL Import panel on
`/admin/convert` without affecting local conversion.

## Deploy order

1. Provision private S3-compatible bucket + lifecycle rules and PostgreSQL.
2. Deploy Docker roles with `ACCEPT_NEW_JOBS=false`; verify media-worker has no egress.
3. Deploy `adminConverterApi` with HMAC secrets; smoke `session`.
4. Deploy frontend (capability may remain enabled in code; keep `ACCEPT_NEW_JOBS=false`).
5. Enable `ACCEPT_NEW_JOBS=true` for one admin; smoke direct HTTPS.
6. Enable `ENABLE_YOUTUBE_CONNECTOR=true` only after risk acknowledgment copy is verified.

## Rollback

1. Set `ACCEPT_NEW_JOBS=false`.
2. Optionally disable `ENABLE_YOUTUBE_CONNECTOR`.
3. Optionally remove/disable `converter.url.import` capability and redeploy frontend.
4. Let active jobs drain; cleanup worker continues reclaiming storage.
