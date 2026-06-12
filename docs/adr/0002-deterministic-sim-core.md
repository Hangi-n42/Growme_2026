# ADR 0002: Deterministic Simulation Core

## Status

Accepted

## Context

The v0.1 slice depends on economy correctness, NPC schedules, contracts, save/load, and reproducible automated tests.

## Decision

All gameplay rules live in deterministic TypeScript under `packages/sim-core`.

The simulation is replayable from:

- Initial state.
- Seed.
- Authored content version.
- Command log.

## Constraints

- No Phaser dependency.
- No DOM dependency.
- No browser storage dependency.
- No network dependency.
- No runtime LLM call.
- No wall-clock time.
- No unseeded `Math.random()`.

## Consequences

- Phaser is a command client.
- E2E bugs can be reduced to sim command logs.
- Economy, NPC, save, and content tests can run headlessly.
