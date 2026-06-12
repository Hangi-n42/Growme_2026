# Game Design Document

## Overview

Growme_2026 is a browser-based solo cozy economy action sandbox. The player lives near a small village, performs practical work, and helps residents through farming, crafting, gathering, contracts, trade, relationships, and home/farm decoration.

## v0.1 Slice

The Solo NPC Economy Slice must prove the first three in-game days are playable and deterministic. The content target is small but complete:

- 1 village/home area.
- 1 farm/home decoration area.
- 2 nearby action zones, one of which is a shallow mine.
- At least 5 NPC residents, target 6.
- 3 NPC shops: seed shop, workshop, and general goods.
- 8 to 12 item definitions.
- 3 to 5 recipes.
- 10 to 12 requests or contracts.
- 3 story events: arrival, first harvest, and blocked path restoration.

## Core Loop

1. Player wakes at home with restored energy.
2. Player checks NPC requests, relationship opportunities, and shop needs.
3. Player farms, gathers, mines, or crafts.
4. Player trades, fulfills a contract, gives a liked item, or decorates.
5. NPC/shop inventory, relationship flags, and village progress update.
6. Player saves or sleeps.
7. Day advances, crops grow, shops restock, zones reset, and schedules change.

## Command Surface

The Phaser client sends commands to sim-core. Example commands:

- `advanceTime`
- `sleepToNextDay`
- `tillTile`
- `plantCrop`
- `waterCrop`
- `harvestCrop`
- `gatherZone`
- `mineRock`
- `craftRecipe`
- `buyItem`
- `sellItem`
- `acceptContract`
- `completeContract`
- `talkToNpc`
- `giveGift`
- `placeDecor`
- `saveSnapshot`
- `loadSnapshot`

Commands validate preconditions before state changes and return structured events for presentation.

## Simulation Rules

- Economy math uses integer units.
- Randomness is seeded and stored in sim state.
- Authored content is versioned and schema-validated.
- NPC schedules must always resolve to a valid location.
- Relationship milestone flags trigger once and persist.
- Shop buy prices must stay below shop sell prices after modifiers.
- Critical progression goods need a guaranteed fallback source.

## v0.1 Acceptance

- Complete farm -> gather/action -> craft -> trade/request -> relationship -> decorate -> save/reload -> sleep loop.
- First three in-game days pass automated browser tests.
- Same seed plus command log replays exactly.
- No command creates negative inventory, negative currency, item duplication, or unreachable progression.
- Economy simulations find 0 infinite money loops and 0 progression deadlocks.
- Content validation and save/load roundtrip pass.
