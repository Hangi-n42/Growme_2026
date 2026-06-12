# Test Plan

## Scaffold Checks

The initial repository uses dependency-free smoke checks so the scaffold can be validated before dependencies are installed:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:unit`
- `pnpm test:sim`
- `pnpm test:npc`
- `pnpm test:economy`
- `pnpm test:content`
- `pnpm test:save-load`
- `pnpm test:e2e`
- `pnpm test:first-3-days`
- `pnpm test:perf-smoke`
- `pnpm sim:7days`
- `pnpm sim:30days`
- `pnpm eval:quality`
- `pnpm check:protected-files`
- `pnpm check:no-test-skip`
- `pnpm check:no-quality-threshold-lowering`

Once dependencies are installed, `pnpm typecheck` must run the real TypeScript project build.

## Unit Tests

Coverage target:

- Command validation.
- Inventory add/remove and stack limits.
- Time/day transitions.
- Farming lifecycle.
- Crafting transactions.
- Shop pricing.
- Contract rewards.
- Relationship milestones.
- Save serialization.

Gate: no business logic covered only by snapshots.

## Simulation Tests

Required deterministic scenarios:

- New player.
- Casual player.
- Optimizer.
- Hoarder.
- Heavy seller.
- Contract-focused player.

Gate: 7-day and 30-day sims must report 0 infinite money loops, 0 progression deadlocks, and no negative inventory or currency unless explicitly modeled as debt.

## NPC Tests

Coverage target:

- Dialogue priority.
- Schedule resolution for every hour.
- Shop open/closed behavior.
- Request accept/progress/complete.
- Relationship milestone persistence.
- Story event one-shot flags.

Gate: every v0.1 NPC has valid authored content and no placeholder player-facing name.

## Browser Tests

Use Playwright for release-candidate browser tests.

First three days must:

- Start from empty storage.
- Use a fixed seed.
- Reach day 3.
- Complete farm, craft, gather/action, trade, contract, relationship, decoration, save, and reload milestones.
- Fail on uncaught exception, failed asset load, blank screen, stuck loading state, or persistent console error.

## Performance Smoke

Release-candidate thresholds:

- Boot to first playable under 3000 ms on the CI baseline.
- Average frame time no more than 20 ms in the smoke path.
- Save/load roundtrip under 250 ms.
- First-3-days memory no more than 512 MB.

## Protected Checks

- No focused or skipped tests in committed code.
- No quality threshold lowering without ADR.
- No forbidden dependency or import.
- No Phaser dependency inside sim-core.
- No runtime network or LLM dependency for gameplay.
