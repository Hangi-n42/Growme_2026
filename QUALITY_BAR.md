# Quality Bar

The quality bar is a release contract, not a suggestion. The scaffold may pass smoke checks before gameplay exists, but v0.1 cannot be called releasable until every release-candidate gate below is satisfied.

## Non-Negotiables

- Solo play must be fun without multiplayer.
- Phaser is presentation and input only.
- Gameplay rules, validation, and progression live in `packages/sim-core`.
- Sim-core must be deterministic from seed plus command log.
- No runtime LLM NPC dialogue in v0.1.
- NPC content must be authored, schema-validated, and original.
- No PixiJS dependency or import.
- No quality threshold may be lowered without an ADR and quality-director signoff.
- Quality thresholds may only tighten unless an ADR explicitly changes them.

## v0.1 Release Candidate Gates

- Automated browser test proves the first 3 in-game days are playable.
- At least 5 NPC residents have distinct schedules, jobs, preferences, requests, and relationship hooks.
- Player can farm, craft, gather/action, buy/sell with NPCs, complete contracts, improve relationships, decorate, save, and reload.
- Economy simulation finds 0 infinite money loops.
- Economy simulation finds 0 progression deadlocks.
- Content validation passes with unique IDs and resolved references.
- Save/load roundtrip preserves full gameplay state.
- Release candidate has 0 core gameplay placeholder rectangles.
- Typecheck, unit, sim, NPC, economy, content, save/load, e2e, first-3-days, perf smoke, and quality eval gates pass.

## Review Expectations

- PRs must state which issue they close and which gates ran.
- PRs changing gameplay must include sim-core tests.
- PRs changing Phaser scene behavior must prove the client calls sim-core commands instead of duplicating rules.
- PRs changing economy data must run arbitrage, recipe ROI, contract reward, 7-day sim, and 30-day sim checks.
- PRs changing content must run schema validation and content reachability checks.
- PRs changing save shape must include migration and roundtrip tests.
- PRs changing quality gates must pass `pnpm check:no-quality-threshold-lowering`.

## Failure Policy

Do not hide failures by skipping tests, lowering thresholds, moving logic out of sim-core, or reclassifying release-candidate requirements as stretch goals. If a gate is not yet implemented, keep it documented as a release blocker and provide a scaffold smoke check only for repository bootstrapping.
