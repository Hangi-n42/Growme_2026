# Relationship System Spec

## Purpose

Define deterministic resident affinity, milestones, and unlock hooks.

## Requirements

- Track affinity from 0 to 100 per resident.
- Use milestone thresholds at 20, 40, 60, and 80.
- Award affinity through talking once per day, completing requests, giving liked gifts, and story participation.
- Cap daily gains to prevent gift spam from bypassing pacing.
- Milestones unlock authored dialogue, requests, shop perks, or story hooks.

## Non-Goals

- No romance system in v0.1.
- No jealousy, rivalry, or faction simulation.
- No hidden irreversible relationship failure.

## Acceptance Criteria

- Milestones trigger once and persist.
- Required relationship gates are reachable without perfect play.
- NPC progression cannot require an item unlocked only by that same progression.

## Tests and Gates

- `pnpm test:npc`
- `pnpm test:save-load`
- Relationship progression balance scenarios.
