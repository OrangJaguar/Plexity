# Plan 01 — Scaffold Brawl tool shell

## Goal

Register **Brawl** as a Plexity tool and ship empty-but-real navigation shells so later plans fill panels without rewiring IA.

## Adjustments (from codebase)

- Follow existing pattern: `TOOL_REGISTRY` + `TOOL_PAGE_META` + `PAGE_BY_ID` + `Tools*Page` + `*Content` — route `/brawl`, **no wildcard** (panel state in React, not nested routes).
- Bump `EXPECTED_TOOL_COUNT` **19 → 20**; update `converter-v1-parity.test.js` hardcoded `19`.
- Settings: add searchable **Brawl** section stub; deep-link via `?q=brawl`.
- Catalog preview component required by `loadPreview`.
- CSS in `app.css` under `.tools-brawl-*` / `.tools-page--brawl`.
- Keep shell pure UI — no API, no SQL.

## Achievements

- [x] Register tool + page + preview (`Swords` icon, `/brawl`)
- [x] Ranked | Team tools (top-right)
- [x] Solo | Trio (top-left, Ranked only)
- [x] Stub empty states → Settings (`?q=brawl`)
- [x] Settings Brawl stub section + link back to tool
- [x] Tests / count parity (20 tools); panel helper tests

## Out of scope

- API calls, SQL, draft logic, voice

## Acceptance

- [x] `/brawl` opens from tools catalog/pin
- [x] Toggles switch panels without remounting the whole app awkwardly
- [x] Tests updated for tool count / route parity
- [x] Relevant tests pass

## Manual gate

None.

## Status: DONE
