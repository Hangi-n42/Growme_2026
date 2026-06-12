# Core Loop Spec

## Purpose

Define the smallest complete v0.1 loop that proves the solo game is fun and testable.

## Requirements

- Player starts each day at home with restored energy.
- Player can check NPC requests, shop stock, and relationship opportunities.
- Player can farm, gather/action, mine, craft, trade, complete a contract, improve a relationship, decorate, save, reload, and sleep.
- Day transition advances crops, schedules, shop restocks, zone depletion resets, contracts, and story flags through sim-core.
- Every gameplay mutation flows through sim-core commands.

## Non-Goals

- Multiplayer.
- Real-time online economy.
- Runtime generated dialogue.
- Full world map or multiple villages.

## Acceptance Criteria

- A deterministic command log can complete the loop from a fresh save.
- Automated browser test can complete the first three in-game days.
- Player always has at least one productive action available in normal play.

## Tests and Gates

- `pnpm test:sim`
- `pnpm test:first-3-days`
- Replay determinism.
- No Phaser-owned gameplay rules.
