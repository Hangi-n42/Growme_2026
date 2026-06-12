# ADR 0005: Quality Gates

## Status

Accepted

## Context

The main v0.1 risk is shipping a slice that appears playable but is not deterministic, not testable, or not expandable.

## Decision

Use hard quality gates for deterministic simulation, sim-core ownership, economy invariants, scope exclusions, content validation, save/load, first-3-days browser playability, and release placeholder audit.

## Gates

- No multiplayer as a v0.1 requirement.
- No runtime LLM NPC dialogue.
- Phaser only dispatches deterministic sim-core commands.
- Same seed plus command log replays exactly.
- Typecheck, unit, sim, NPC, economy, content, save/load, e2e, first-3-days, perf, and quality eval checks pass.
- Economy has 0 infinite money loops and 0 progression deadlocks.
- Release candidate has 0 core gameplay placeholder rectangles.

## Consequences

- Work may be deferred rather than weakening determinism or testability.
- Quality thresholds may only tighten unless an ADR explicitly changes them.
