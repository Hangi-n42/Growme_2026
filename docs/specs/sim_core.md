# Sim Core Spec

## Purpose

Define the deterministic TypeScript gameplay authority.

## Requirements

- Own authoritative game state, command validation, state transitions, seeded RNG, event output, selectors, and serialization helpers.
- Expose serializable commands and typed results.
- Ensure every failed command is transactional.
- Store all randomness in deterministic seed state.
- Support replay from initial state, content version, seed, and command log.

## Non-Goals

- No Phaser import.
- No DOM or browser storage.
- No wall-clock time.
- No network calls.
- No runtime LLM dependency.

## Acceptance Criteria

- Same input sequence produces byte-identical output.
- Invalid commands cannot create negative inventory, negative currency, item duplication, or inconsistent flags.
- Sim-core tests run headlessly.

## Tests and Gates

- `pnpm test:unit`
- `pnpm test:sim`
- `pnpm test:save-load`
- No `Math.random()` inside sim-core.
