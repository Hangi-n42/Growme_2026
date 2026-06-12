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

These are the shared v0.1 release targets for roadmap planning, content validation, and the release checklist. A release candidate may exceed the target counts only when the extra content is validated, original, deterministic, and covered by the same quality gates.

## Core Loop

1. Player wakes at home with restored energy.
2. Player checks NPC requests, relationship opportunities, and shop needs.
3. Player farms, gathers, mines, or crafts.
4. Player trades, fulfills a contract, gives a liked item, or decorates.
5. NPC/shop inventory, relationship flags, and village progress update.
6. Player saves or sleeps.
7. Day advances, crops grow, shops restock, zones reset, and schedules change.

## First Three Days Proof

The first-three-days automated path is the release proof for the v0.1 solo slice. It may use the shortest available valid content route, but it must exercise every core loop milestone:

- Day 1: start from empty storage with a fixed seed, meet a resident, inspect a request or shop, farm, action/gather or mine, save, reload, and sleep.
- Day 2: harvest or progress a crop, craft, trade, make contract progress, improve one relationship state, place or move decor, and sleep.
- Day 3: complete at least one contract or request, confirm village or economy progress, save, reload, and verify no deadlock, blank screen, uncaught exception, failed asset load, or persistent console error.

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

- Complete farm -> craft -> action/gather -> trade/request -> relationship -> decorate -> save/reload -> sleep loop.
- First three in-game days pass automated browser tests.
- Same seed plus command log replays exactly.
- No command creates negative inventory, negative currency, item duplication, or unreachable progression.
- Economy simulations find 0 infinite money loops and 0 progression deadlocks.
- Content validation and save/load roundtrip pass.
