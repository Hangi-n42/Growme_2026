# Release Checklist

## Scope Lock

- [ ] Release is v0.1 Solo NPC Economy Slice.
- [ ] No multiplayer, accounts, matchmaking, remote authority, or player-to-player trade is required or enabled.
- [ ] No runtime LLM NPC dialogue is used.
- [ ] All player-facing names, items, symbols, layouts, and content are original.

## Architecture Lock

- [ ] Phaser sends commands to `packages/sim-core` and renders returned state/events.
- [ ] Sim-core has no Phaser, DOM, browser storage, wall-clock, network, or unseeded RNG dependency.
- [ ] Save data is versioned.
- [ ] Command log replay is deterministic.

## Gameplay Lock

- [ ] Automated first-3-days test proves the solo core loop.
- [ ] At least 5 NPC residents have distinct schedules, jobs, preferences, requests, relationship hooks, memory flags, and story links.
- [ ] Player can farm, craft, gather/action, buy/sell, complete contracts, improve relationships, decorate, save, and reload.
- [ ] Economy sim reports 0 infinite money loops.
- [ ] Economy sim reports 0 progression deadlocks.

## Quality Lock

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test:unit`
- [ ] `pnpm test:sim`
- [ ] `pnpm test:npc`
- [ ] `pnpm test:economy`
- [ ] `pnpm test:content`
- [ ] `pnpm test:save-load`
- [ ] `pnpm test:e2e`
- [ ] `pnpm test:first-3-days`
- [ ] `pnpm test:perf-smoke`
- [ ] `pnpm sim:7days`
- [ ] `pnpm sim:30days`
- [ ] `pnpm eval:quality`
- [ ] `pnpm check:protected-files`
- [ ] `pnpm check:no-test-skip`
- [ ] `pnpm check:no-quality-threshold-lowering`

## Visual and UX Lock

- [ ] No core gameplay placeholder rectangles remain in release candidate.
- [ ] First-time play path is understandable without external documentation.
- [ ] UI never claims multiplayer support in v0.1.
- [ ] Shops, requests, relationship progress, and save/reload state are legible.

## PR Evidence

- [ ] PR links the release issue.
- [ ] Test output is included in PR body.
- [ ] Browser artifacts are uploaded for e2e failures.
- [ ] Sim reports are attached or linked.
- [ ] Known issues list has no P0 or P1 defects.
