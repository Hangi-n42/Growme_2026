# NPC System Spec

## Purpose

Define v0.1 resident behavior, schedules, jobs, memory, shops, and story events.

## Requirements

- Include at least 5 original NPC residents, target 6.
- Each resident has a job, home, schedule, preference profile, request hooks, relationship hooks, memory flags, and story participation.
- Schedules support weekday, weekend, rain override, and story override.
- NPC lookup must resolve a valid location for every hour.
- Shops are tied to NPC availability when appropriate.

## Non-Goals

- No romance system.
- No procedural biographies.
- No pathfinding failure simulation.
- No faction reputation in v0.1.

## Acceptance Criteria

- Player can meet every v0.1 resident.
- Every resident has distinct daily purpose and economic role.
- Save/load preserves NPC flags, relationship state, active requests, and story completion.

## Tests and Gates

- `pnpm test:npc`
- Schedule coverage for every NPC and hour.
- Content validation for unique IDs and valid locations.
