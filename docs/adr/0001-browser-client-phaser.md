# ADR 0001: Browser Client Uses Phaser

## Status

Accepted

## Context

The game is a browser action sandbox that needs fast iteration on input, scenes, sprites, UI overlays, and automated browser testing.

## Decision

Use Phaser as the browser client framework for v0.1.

Phaser owns:

- Rendering.
- Input collection.
- Scene transitions.
- Audio and animation playback.
- Presentation of events returned by sim-core.

Phaser does not own:

- Gameplay rules.
- Economy state.
- NPC schedules.
- Inventory mutation.
- Save schema.
- Deterministic randomness.

## Consequences

- Phaser client code must call sim-core commands.
- No PixiJS dependency or import is permitted.
- Browser e2e tests should validate that UI actions route through sim-core.
