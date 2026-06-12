# Web Client Spec

## Purpose

Define the Phaser browser client boundary.

## Requirements

- Use Phaser for rendering, input, scenes, animation, and sound.
- Initialize sim-core with a seed and content manifest.
- Dispatch user actions as sim-core commands.
- Render state and event output from sim-core.
- Provide visible UI for inventory, energy, clock, wallet, active requests, relationships, shops, save, and reload.
- Persist local save through the save-persistence adapter.

## Non-Goals

- No PixiJS.
- No gameplay calculations in scene code.
- No multiplayer UI or online account path.
- No runtime LLM calls.

## Acceptance Criteria

- UI state matches sim snapshot after each command.
- Browser boots without console errors.
- Client tests can prove scene actions route through sim-core.

## Tests and Gates

- `pnpm test:e2e`
- `pnpm test:first-3-days`
- `pnpm test:perf-smoke`
- Boundary check: Phaser imports sim-core public API only.
