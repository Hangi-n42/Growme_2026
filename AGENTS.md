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

For supervised/local agent work, use the fetch and branch commands below. For unattended automation
jobs, do not run shell network Git inside the job body; follow the Unattended Automation Contract
instead.

1. Create or select a GitHub Issue before implementation. Every issue must include requirements, non-goals, acceptance criteria, tests, quality gates, and suggested agent.
2. Fetch remote main immediately before starting work: `git fetch origin main`.
3. Start each feature from the freshly fetched main ref with a Git worktree branch prefixed with `codex/`: `git switch -c codex/<issue-slug> origin/main`.
4. Before editing files, verify the local head branch includes the latest fetched main commit: `git merge-base --is-ancestor origin/main HEAD` and `corepack pnpm@10.12.1 run check:branch-freshness`.
5. If continuing an existing `codex/` branch, fetch first, then rebase or merge `origin/main` before editing: `git fetch origin main` followed by `git rebase origin/main`.
6. Keep changes scoped to the issue. Do not refactor unrelated systems.
7. Run the narrowest meaningful local checks before committing.
8. Before opening or updating a GitHub Pull Request, repeat the fetch and freshness check so the PR head contains the latest `origin/main`.
9. Open a GitHub Pull Request with the issue link, test results, risks, and screenshots or reports when relevant.
10. Do not merge unless GitHub Actions quality gates pass or the PR is explicitly marked as non-release documentation work.

## Unattended Automation Contract

- Unattended jobs must follow `docs/automation/unattended-pipeline.md`.
- `green-pr-merger` may only inspect and merge existing green PRs. If there are no open PRs, it must exit no-op and must not select issues or implement work.
- Issue selection, workspace verification, implementation, and PR updates are separate roles. A job must not silently fall through from one role into another.
- GitHub writes in unattended jobs must use a non-interactive token or the GitHub connector. Do not run `gh auth login` or `gh auth status` inside an unattended job body.
- Codex App automation setup must load `C:\Users\dsl\.codex\secrets\growme_gh_token.txt` into `GH_TOKEN` and `GITHUB_TOKEN`; it must not load the maintenance token by default.
- Token-based GitHub preflight must use `gh api user` and `gh api repos/Hangi-n42/Growme_2026`, not `gh auth login` or `gh auth status`.
- Implementation workers must not write issue labels or issue comments before implementation. Issue selection and workspace verification are read-only; PR publication is the first required GitHub write.
- Shell network Git commands such as `git fetch`, `git pull`, and `git push` are forbidden inside unattended job bodies. Git metadata writes such as `git switch`, `git checkout`, `git branch`, `git add`, `git commit`, and `git reset` are also forbidden inside unattended job bodies.
- The local environment setup must refresh `origin` remote-tracking refs before the job starts, and PR publication must use the GitHub connector or stop with a blocked result.
- `implementation-worker` and `pr-updater` must pass `node tools/scripts/automation-preflight.mjs --role=<role>` before mutable work. In Codex App detached worktrees, they must pass the same preflight with `--allow-detached` and publish through the GitHub connector instead of creating local branches or commits.
- If read-only setup fails, stop before editing files. Do not attempt blocked issue comments from the failing path.
- Use `node tools/scripts/automation-gate-plan.mjs` to select touched-surface gates, then run the full release gate set before PR readiness when required.

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
- `pnpm check:automation-contract`
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

## Local Windows command rule

On this Windows Codex App environment, direct `pnpm` may not be on PATH because Corepack cannot create global shims under C:\Program Files\nodejs.

Use explicit Corepack invocation for local commands:

- corepack pnpm@10.12.1 install --frozen-lockfile
- corepack pnpm@10.12.1 run lint
- corepack pnpm@10.12.1 run typecheck
- corepack pnpm@10.12.1 run test:unit
- corepack pnpm@10.12.1 run test:sim

Do not assume the global `pnpm` shim exists in local Codex App worktrees. 
