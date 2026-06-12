# Vision

Growme_2026 is a solo-first browser cozy economy action sandbox. The player makes a small original village thrive through practical work, fair trade, authored resident relationships, and visible local routines.

## v0.1 Target

v0.1 is the Solo NPC Economy Slice. It proves that the game is fun alone before any multiplayer work exists.

The slice must let the player:

- Farm and harvest useful goods.
- Craft basic items and decorations.
- Gather in action zones, including a shallow mine.
- Buy and sell through NPC shops.
- Complete contracts and resident requests.
- Improve relationships through deterministic authored interactions.
- Decorate a home or farm space.
- Save, reload, and continue.
- Progress the village economy without exploits or deadlocks.

## Guardrails

- Phaser is the browser presentation framework.
- Gameplay rules live in deterministic TypeScript `packages/sim-core`.
- Phaser dispatches commands and renders state/events returned by sim-core.
- NPC dialogue is authored data only in v0.1.
- Multiplayer, accounts, matchmaking, remote authority, and player-to-player trade are out of v0.1.
- Runtime LLM NPC dialogue is out of v0.1.
- Names, roles, item identities, economy symbols, visuals, and UI layout must be original.

## Success Statement

A release candidate succeeds when an automated browser test can play the first three in-game days and prove the core solo loop: gather, farm, craft, trade, complete contracts, improve a relationship, decorate, save, reload, and advance the village economy.
