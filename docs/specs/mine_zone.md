# Mine Zone Spec

## Purpose

Define the v0.1 mine as a compact action zone.

## Requirements

- Mine supports shallow floors 1 through 5 for v0.1.
- Actions include enter, break rock, collect ore, descend when exit is revealed, and leave.
- Rock definitions include energy cost, hit rules, and deterministic drop table.
- Mine progress persists as deepest reached floor.
- Daily mine instance may reset on sleep, while deepest floor persists.

## Non-Goals

- No combat.
- No lighting system.
- No procedural maze generation.
- No elevator network beyond deepest floor marker.

## Acceptance Criteria

- Player can enter, spend energy, receive stone or ore, and leave.
- Descend is unavailable until sim-core marks exit revealed.
- Energy exhaustion prevents mining.

## Tests and Gates

- `pnpm test:sim`
- Floor generation determinism.
- Mining reward and energy tests.
- Deepest floor save/load test.
