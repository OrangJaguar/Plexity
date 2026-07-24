# Admin Converter AI (Plan 7)

Admin-only OCR, transcription, and NL-to-allowlisted-plan assist on the shared Converter page.
Public Converter stays local-first with an empty capability map.

## Capabilities (independent kill switches)

| Capability | Purpose |
|---|---|
| `converter.ai.assist` | NL plan drafts, naming, summary, compress suggestions |
| `converter.ai.ocr` | OCR / table / schema / alt-text |
| `converter.ai.transcribe` | STT, translate, SRT/VTT sidecars |

Remove or set a key to `false` in `ADMIN_TOOL_CAPABILITY_DELTAS.converter` to hide that UI without touching the others.

## Kill switches (server)

| Env | Default | Effect |
|---|---|---|
| `ENABLE_AI_PROVIDER` | `false` | When false, Base44 uses offline allowlisted drafts; Docker `/v1/ai/create` returns `AI_DISABLED`. |
| `ACCEPT_NEW_AI_JOBS` | `true` | When false, new AI jobs are rejected while in-flight jobs can drain. |

Mirror both on Base44 `adminConverterAiApi` and `services/converter-media` (api + ai-worker).

## Secrets (server-side only)

Never put provider keys in the browser bundle.

- `OPENAI_API_KEY` — primary OpenAI-compatible chat / whisper / vision
- `ANTHROPIC_API_KEY` — fallback chat/vision JSON
- `AI_PRIMARY_MODEL` / `AI_FALLBACK_MODEL`
- `CONVERTER_MEDIA_CONTROL_URL` + `CONVERTER_MEDIA_HMAC_SECRET` (and callback secret)

## Budgets

Per-admin daily soft warning and hard block (mirrored in `ai-quotas.js`):

- Max ~20 AI requests / day
- Soft ~$5 USD bucket, hard ~$15 USD
- Temp uploads retained ~15 minutes, then wiped

Usage entity `AdminConverterAiUsage` stores **bucket** fields only (no prompts, URLs, filenames, or raw token counts).

## Architecture

```
Admin UI → adminConverterAiApi (Base44) → optional HMAC → converter-media /v1/ai/*
                                                    → ai-worker → OpenAI / Anthropic
```

AI never emits arbitrary ffmpeg argv. Plans/recipes must pass `REMOTE_PLAN_OPERATION_ALLOWLIST` / `converter-recipe.v1`.

## Deploy order

1. Configure secrets on Base44 + media service (keys present, providers still **disabled**).
2. Deploy `ai-worker` with `ENABLE_AI_PROVIDER=false` and `ACCEPT_NEW_AI_JOBS=false`.
3. Deploy `adminConverterAiApi` + entities (`AdminConverterAiUsage`, `AdminConverterAiJob`).
4. Ship UI with AI capability keys present but keep server kill switches off (panels can show offline drafts).
5. Enable `ENABLE_AI_PROVIDER=true` for **assist** first; smoke `converter.ai.assist.plan`.
6. Enable OCR (`converter.ai.ocr` traffic).
7. Enable STT last (`converter.ai.transcribe`).

## Rollback

1. Set `ACCEPT_NEW_AI_JOBS=false` and `ENABLE_AI_PROVIDER=false` on api + ai-worker.
2. Optionally remove/disable `converter.ai.*` capability keys so UI hides panels.
3. Let queued AI jobs drain or cancel; cleanup worker wipes temp objects.
4. Non-AI Converter (local + Plan 5/6 URL/playlist/package) remains unchanged.

## Privacy copy

- Public empty state: local-only files, nothing uploaded.
- Admin AI panels: disclose temporary cloud processing and deletion; require human confirm before paid actions.
