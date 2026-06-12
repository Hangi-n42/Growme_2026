# Roadmap

## Milestones

### M0: Autonomous Repository Foundation

Deliver repository governance, quality gates, workspace scaffolds, project agents, and smoke checks.

Gate: all scaffold checks pass locally and in PR.

### M1: Deterministic Sim Core Foundation

Deliver state, command reducer, seeded RNG, event log, inventory, wallet, time, save snapshot shape, and replay determinism.

Gate: `pnpm test:unit`, `pnpm test:sim`, and `pnpm test:save-load` pass with real sim assertions.

### M2: Content Schema and NPC Data

Deliver item, recipe, NPC, schedule, dialogue, relationship, shop, contract, zone, and decor schemas plus validated seed content.

Gate: `pnpm test:content`, `pnpm test:npc`, and authored content originality review pass.

### M3: Economy and Action Loop

Deliver farming, crafting, gathering, mine, shops, contracts, relationship rewards, and economy simulations.

Gate: `pnpm test:economy`, `pnpm sim:7days`, and `pnpm sim:30days` find 0 infinite money loops and 0 deadlocks.

### M4: Phaser Playable Slice

Deliver browser rendering, input, command adapter, HUD, shop/request UI, save/reload UI, and first-3-days automation.

Gate: `pnpm test:e2e`, `pnpm test:first-3-days`, and `pnpm test:perf-smoke` pass.

### M5: v0.1 Release Candidate

Deliver balance, visual polish, placeholder audit, release checklist, and PR evidence.

Gate: every release-candidate gate in `QUALITY_BAR.md` and `quality-gates.yml` passes.

## Backlog Issues

### V01-001: Implement deterministic sim-core command foundation

Requirements:

- Add authoritative sim state, command types, reducer, seeded RNG, event log, inventory, wallet, time, and replay fixture.
- Commands must be serializable and transactional.

Non-goals:

- No Phaser rendering.
- No full gameplay content tables.

Acceptance criteria:

- Same seed plus command sequence produces byte-identical state and events.
- Failed command leaves state unchanged and emits a typed failure event.

Tests:

- `pnpm test:unit`
- `pnpm test:sim`
- replay determinism fixture

Quality gates:

- No Phaser import in sim-core.
- No `Math.random()` or wall-clock dependency in sim-core.

Suggested agent: `sim-core-implementer`

### V01-002: Define content schemas and validator

Requirements:

- Add schemas for items, recipes, NPCs, schedules, dialogue, relationships, shops, contracts, zones, decor, and save versions.
- Validator must check unique IDs, references, empty text, reward bands, schedule locations, and v0.1 minimum NPC count.

Non-goals:

- No runtime content editing UI.
- No procedural NPC generation.

Acceptance criteria:

- Invalid references fail with actionable messages.
- Seed content can be validated from a clean checkout.

Tests:

- `pnpm test:content`
- malformed fixture tests

Quality gates:

- Authored NPC dialogue only.
- No placeholder player-facing NPC names.

Suggested agent: `content-pipeline-implementer`

### V01-003: Author v0.1 resident roster and request hooks

Requirements:

- Add at least 5 residents with distinct schedules, jobs, preferences, requests, relationship hooks, memory flags, and shop/story links.
- Target roster: Nia Moss, Oren Clay, Tavi Reed, Mara Well, Ilo Fen, and Sena Vale.

Non-goals:

- No romance system.
- No runtime LLM dialogue.

Acceptance criteria:

- Player can meet every resident.
- Each resident has at least 2 requests and at least 15 authored dialogue lines before release candidate.

Tests:

- `pnpm test:npc`
- content validation for schedules, dialogue priorities, flags, and request reachability

Quality gates:

- NPC schedules resolve valid locations every hour.
- Relationship milestones trigger once and persist.

Suggested agent: `npc-narrative-designer`

### V01-004: Implement shops, contracts, and economy invariants

Requirements:

- Add shop stock caps, restock intervals, accepted categories, budgets, buy/sell multipliers, contract reward bands, cooldowns, and anti-arbitrage route search.

Non-goals:

- No loans, banking, auctions, real-time global markets, or player-run shops.

Acceptance criteria:

- Vendor sell price is always greater than vendor buy price for the same item after modifiers.
- No same-day zero-risk buy/sell route is profitable.

Tests:

- `pnpm test:economy`
- `pnpm sim:7days`
- `pnpm sim:30days`

Quality gates:

- Infinite money loop count is 0.
- Progression deadlock count is 0.

Suggested agent: `npc-economy-designer`

### V01-005: Implement farming, crafting, gathering, mine, and decoration commands

Requirements:

- Add sim-core commands for till, plant, water, harvest, gather, mine, craft, place, move, rotate, and remove decor.
- Every command must validate energy, inventory, bounds, collisions, depletion, and unlocks.

Non-goals:

- No combat.
- No large procedural map.
- No advanced decoration layering.

Acceptance criteria:

- Fresh save can produce, sell, craft, mine, decorate, and sleep.
- Invalid placement or craft cannot duplicate or delete items.

Tests:

- `pnpm test:unit`
- `pnpm test:sim`
- `pnpm test:save-load`

Quality gates:

- Gameplay rules live in sim-core, not Phaser.
- Save/load restores farm, mine, inventory, and home layout.

Suggested agent: `action-systems-designer`

### V01-006: Build Phaser command-rendering shell

Requirements:

- Add playable browser shell that initializes sim-core, dispatches commands, renders state/events, and shows inventory, clock, requests, shops, and save/reload controls.

Non-goals:

- No client-owned gameplay calculations.
- No multiplayer UI or online account flow.

Acceptance criteria:

- UI state matches sim snapshot after each command.
- Browser can boot without console errors.

Tests:

- `pnpm test:e2e`
- command adapter boundary test

Quality gates:

- Phaser imports sim-core commands/types/selectors only.
- No release-candidate core gameplay placeholder rectangles.

Suggested agent: `phaser-client-implementer`

### V01-007: Implement local save, migrations, and roundtrip tests

Requirements:

- Add versioned local save schema, serialization, deserialization, validation, migration harness, corrupted-save failure path, and browser reload resume.

Non-goals:

- No cloud saves.
- No account-based sync.

Acceptance criteria:

- Save/load roundtrip preserves day, energy, inventory, farm, mine, NPC flags, relationships, contracts, shops, decor, and command log pointer.

Tests:

- `pnpm test:save-load`
- browser reload smoke

Quality gates:

- Local save first.
- Migrations are covered before save version changes merge.

Suggested agent: `save-persistence-implementer`

### V01-008: Automate first three in-game days

Requirements:

- Add Playwright test that starts from empty storage with fixed seed, plays through day 3, completes core loop milestones, saves, reloads, and captures artifacts on failure.

Non-goals:

- No broad cross-browser matrix until the Chromium path is stable.

Acceptance criteria:

- Test proves farm, craft, action/gather, trade, contract, relationship, decoration, save, reload, and day progression.

Tests:

- `pnpm test:first-3-days`
- `pnpm test:e2e`

Quality gates:

- No uncaught exceptions, failed asset loads, blank screens, or persistent console errors.
- First three days are playable without debug tools.

Suggested agent: `qa-automation`
