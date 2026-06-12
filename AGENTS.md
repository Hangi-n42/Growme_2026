# Growme_2026 Autonomous Development Guide

This repository is operated by Codex App agents working in Git worktrees, GitHub Issues, GitHub Pull Requests, and GitHub Actions. The current product target is v0.1: Solo NPC Economy Slice.

## Product Direction

- Build a solo-first browser cozy economy action sandbox.
- Use Phaser for the browser client.
- Keep all gameplay rules in `packages/sim-core`.
- Phaser scene code may render state, gather input, dispatch sim-core commands, and animate returned events.
- Phaser scene code must not own crop growth, inventory mutation, crafting costs, NPC schedules, economy math, relationship rules, save schema, or progression gates.
- NPC residents must be authored, deterministic, and rich enough to support schedules, jobs, shops, requests, relationships, memory flags, and story events.
- Do not make multiplayer a v0.1 requirement.
- Do not use runtime LLM NPC dialogue in v0.1.
- Do not copy existing games' IP, names, assets, UI layouts, item identities, or exact economy symbols.
- Do not introduce PixiJS.

## Autonomous Workflow

1. Start each feature from a Git worktree branch prefixed with `codex/`.
2. Create or select a GitHub Issue before implementation. Every issue must include requirements, non-goals, acceptance criteria, tests, quality gates, and suggested agent.
3. Keep changes scoped to the issue. Do not refactor unrelated systems.
4. Run the narrowest meaningful local checks before committing.
5. Open a GitHub Pull Request with the issue link, test results, risks, and screenshots or reports when relevant.
6. Do not merge unless GitHub Actions quality gates pass or the PR is explicitly marked as non-release documentation work.

## Communication policy

- Internal work, code identifiers, filenames, branch names, commands, test names, package names, and technical API names should remain in English unless there is a strong reason to localize them.
- Final responses to the user must be written in Korean.
- GitHub PR titles, PR bodies, PR comments, release notes, and progress reports must be written in Korean.
- GitHub issue comments created by Codex must be written in Korean.
- New follow-up issue bodies should be written in Korean, while preserving existing VS IDs, file paths, command names, and technical terms in English.
- Existing backlog issue titles may remain as-is to avoid breaking references.
- Commit messages may remain concise English conventional messages unless the task explicitly asks otherwise.
- Do not translate code, identifiers, filenames, package names, event names, or schema keys.
- Use Korean explanations with English technical terms where clarity is better, for example: `sim-core`, `GameState`, `quality-gate`, `Playwright E2E`.

## Required Local Gates

Run these as soon as their surface is touched:

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

The initial scaffold uses dependency-free smoke scripts where packages are not installed. Once dependencies are installed, `pnpm typecheck` must run the real TypeScript project build.

## Agent Routing

- `autonomous-orchestrator`: decomposes issues, coordinates worktrees, enforces gates, and prepares PRs.
- `game-director-gdd`: owns vision, pillars, GDD, roadmap, and slice scope.
- `npc-narrative-designer`: owns authored NPC identities, dialogue, schedules, memory flags, and story events.
- `npc-economy-designer`: owns shops, contracts, pricing invariants, demand, and anti-arbitrage rules.
- `action-systems-designer`: owns farming, crafting, gathering, mine, and home decoration specs.
- `sim-core-implementer`: implements deterministic TypeScript simulation commands and selectors.
- `phaser-client-implementer`: implements Phaser presentation that calls sim-core only.
- `content-pipeline-implementer`: implements schemas, validators, and content build checks.
- `save-persistence-implementer`: implements local save, migrations, and roundtrip tests.
- `qa-automation`: implements Playwright, unit, sim, content, save/load, and perf smoke tests.
- `balance-evaluator`: implements 7-day and 30-day economy simulations and exploit detection.
- `ux-playability-evaluator`: evaluates first-session comprehension and moment-to-moment flow.
- `visual-polish-evaluator`: evaluates readable art direction and release placeholder risk.
- `performance-evaluator`: evaluates boot time, frame stability, memory, and save/load timing.
- `quality-director`: owns `QUALITY_BAR.md`, release thresholds, and gate enforcement.
- `release-manager`: owns release checklist, candidate readiness, PR hygiene, and changelog.

## Protected Decisions

- Browser client framework: Phaser.
- Gameplay authority: deterministic TypeScript `sim-core`.
- v0.1 mode: solo only.
- NPC dialogue: authored data only, no runtime LLM dialogue.
- Save strategy: local save first.
- Quality gate policy: thresholds may only tighten without an explicit ADR.
