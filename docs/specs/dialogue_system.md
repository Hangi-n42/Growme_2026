# Dialogue System Spec

## Purpose

Define authored deterministic dialogue selection.

## Requirements

- Dialogue lines are authored data with `speakerId`, `lineId`, `category`, `text`, `conditions`, `priority`, `cooldownDays`, and `setsFlags`.
- Supported categories include first meet, daily, weather, shop, gift like, gift dislike, request offer, request progress, request complete, relationship milestone, and story event.
- Selection priority is active story, active request, first meet, milestone, weather/day context, then daily fallback.
- Text must be localization-ready and non-empty.

## Non-Goals

- No runtime LLM dialogue.
- No procedural text assembly for v0.1.
- No voiceover.

## Acceptance Criteria

- Active request dialogue beats generic daily dialogue.
- Story and milestone dialogue does not repeat after one-shot flags are set.
- No placeholder speaker names or empty player-facing strings.

## Tests and Gates

- `pnpm test:npc`
- `pnpm test:content`
- Authored text originality review.
