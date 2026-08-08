# Plan 07 — Voice intents (English)

## Goal

Admin (or solo user) can drive the draft by voice without LLM latency in the loop.

## Adjustments

- Reuse existing `useSpeechRecognition` (same as command bar) — Web Speech only.
- Confirm/Dismiss chip after Stop mic (mishears recoverable by tap).
- Trio: Mic only when `canEdit` (admin); viewers do not get controls.
- Fuzzy match against **live catalog** names (`voice-intents.js`), not a frozen ID list.

## Design

- Transcript chip + Confirm / Dismiss
- Strict intent parser → draft actions:
  - `set mode …` / `set map …`
  - `ban` / `unban` brawler
  - `enemy picked …`
  - `we pick …` / `pick …` (+ optional `for <nickname>`)
  - `undo`
- No Whisper / LLM in the draft hot path

## Acceptance

- [x] Spoken ban/pick updates board (after Confirm)
- [x] Mishear recoverable via Dismiss + tap UI
- [x] No blocking AI calls mid-draft

## Manual gate

None (browser mic permission is user-local). Chrome/Edge recommended.

## Status: DONE
