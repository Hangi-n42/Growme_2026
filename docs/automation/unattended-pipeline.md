# Unattended Codex Automation Pipeline

This contract defines the default unattended path for Codex App automations in this repository.
The default path is token-backed Git plus `gh`/`gh api`. Jobs that cannot satisfy the preflight
must stop before implementation and report a precise blocked result.

## Role Boundaries

Automations are single-purpose jobs. A job must not silently expand into another role.

| Role | Allowed work | Must not do |
| --- | --- | --- |
| `green-pr-merger` | List open PRs, inspect checks/reviews, and squash merge exactly one eligible green PR. | MUST NOT select issues, create branches, edit files, run implementation gates, or implement work. |
| `issue-worker` | Select one ready issue using issue and PR evidence, verify dependencies, and record the planned `codex/` branch name. | MUST NOT edit files, create commits, merge PRs, or require issue labels/comments before branch setup. |
| `branch-preparer` | Prove this worktree can create a local `codex/` branch, create a commit, and optionally push/delete a temporary remote branch. | MUST NOT select issues, edit product files, leave probe branches behind, or run with a dirty worktree. |
| `workspace-verifier` | Verify fetched `origin/main`, clean worktree, and local freshness before mutable work. | MUST NOT select issues, edit product files, or publish PRs. |
| `implementation-worker` | Edit files only on a named `codex/` branch after branch preparation and freshness checks pass. | MUST NOT continue from detached HEAD, merge PRs, or widen issue scope. |
| `pr-updater` | Re-run freshness checks, commit, push, open/update the PR, and add PR/issue comments with `gh`. | MUST NOT pick a new issue, widen implementation scope, or merge PRs. |

If `green-pr-merger` finds zero eligible PRs, the correct result is no-op. It must not fall
through to issue selection or implementation.

## GitHub Access

Unattended jobs must use token-backed GitHub access from the start:

- Codex App setup reads `C:\Users\dsl\.codex\secrets\growme_gh_token.txt` into both `GH_TOKEN`
  and `GITHUB_TOKEN`.
- The maintenance token file must not be loaded by default automation setup.
- `GIT_ASKPASS` must be configured by setup so `git push` can authenticate without prompts.
- Do not run `gh auth login` or `gh auth status` inside unattended job bodies.

Token preflight must use API calls, not interactive auth commands:

```bash
node tools/scripts/github-token-preflight.mjs
```

It must prove:

- `GH_TOKEN_PRESENT`;
- `gh api user`;
- `gh api repos/Hangi-n42/Growme_2026`.

Missing token access is `BLOCKED_GITHUB_ACCESS`, not a retry loop.

## Default Implementation Path

The default unattended implementation path is:

1. Setup loads `GH_TOKEN` and `GITHUB_TOKEN`.
2. Setup/preflight verifies `gh api user` and `gh api repos/Hangi-n42/Growme_2026`.
3. Setup/preflight verifies Git metadata writes and remote push/delete probe.
4. Job body runs `git fetch origin main`.
5. Job body runs `git switch -c codex/<issue-slug> origin/main`.
6. Implement exactly one selected issue.
7. Run local gates.
8. Run `git add`.
9. Run `git commit`.
10. Run `git push`.
11. Run `gh pr create`, `gh pr edit`, or `gh pr comment`.
12. `green-pr-merger` later uses `gh pr merge`.

## Preflight

Every unattended job must run the narrowest preflight for its role before mutable work:

```bash
node tools/scripts/automation-preflight.mjs --role=green-pr-merger
node tools/scripts/automation-preflight.mjs --role=issue-worker
node tools/scripts/automation-preflight.mjs --role=branch-preparer --probe-remote-push
node tools/scripts/automation-preflight.mjs --role=workspace-verifier
node tools/scripts/automation-preflight.mjs --role=implementation-worker
node tools/scripts/automation-preflight.mjs --role=pr-updater --allow-dirty
```

`issue-worker` must verify token-backed GitHub access with `gh api`.

`branch-preparer` must prove Git metadata writes before implementation starts. It creates a
temporary `codex/__automation_preflight_probe_*` branch from `origin/main`, creates an empty probe
commit, switches back to the original branch or detached HEAD, deletes the local probe branch, and,
when `--probe-remote-push` is used, pushes and deletes the temporary remote branch. It must leave no
local or remote probe branch behind.

`implementation-worker` and `pr-updater` require a named local branch with prefix `codex/`.
They must not continue from detached HEAD. `--allow-detached` is reserved for read-only inspection
or explicit human-directed fallback and is not part of the default mutable path.

All mutable preflight paths require:

- clean worktree unless `--allow-dirty` is passed for post-edit PR update checks;
- fetched `origin/main`;
- `origin/main` as an ancestor of `HEAD` before editing or publishing;
- token-backed GitHub access when the role reads/writes GitHub state.

For the contract check, use:

```bash
node tools/scripts/automation-contract.mjs
```

For gate planning, use:

```bash
node tools/scripts/automation-gate-plan.mjs
node tools/scripts/automation-gate-plan.mjs --full
```

## Issue Metadata Policy

Pre-implementation issue label/comment writes are not required gates.

`codex-working` labels and progress comments are advisory only. They may be attempted after branch
setup succeeds, but a label/comment failure must not block implementation when token-backed branch
setup has already passed. Report skipped or failed metadata writes in the final response.

If issue selection, token preflight, branch preparation, or freshness verification fails, stop before
editing files and report a precise `BLOCKED_*` result.

## Approval-Free Shell Contract

Unattended job bodies must not depend on runtime approval prompts. Anything that would require
interactive approval must be converted into setup/preflight work or reported as blocked.

Allowed after token and branch-preparer preflight succeeds:

- `git fetch origin main`;
- `git switch -c codex/<issue-slug> origin/main`;
- `git add`;
- `git commit`;
- `git push`;
- `gh api`;
- `gh pr create`;
- `gh pr edit`;
- `gh pr comment`;
- `gh pr merge` for `green-pr-merger`;
- `corepack pnpm@10.12.1 run ...` gates when `COREPACK_HOME` is setup-managed.

Blocked inside unattended job bodies:

- `gh auth login`;
- `gh auth status`;
- package install or cache bootstrap unless setup explicitly owns it;
- repeated approval retries;
- continuing mutable work from detached HEAD;
- implementing multiple issues in one run;
- merging from non-merger roles.

## Gate Profiles

Use touched-surface gates during implementation and full release gates for PR readiness. Minimum
touched-surface gates always include protected checks. Gate profiles may only add coverage; they
must not weaken `QUALITY_BAR.md`, release thresholds, protected decisions, or required
release-candidate gates.

## Required Fail-Fast Outcomes

An unattended automation must stop before implementation when it sees any of these states:

- no open PRs for `green-pr-merger`;
- missing `GH_TOKEN`/`GITHUB_TOKEN` access for a role that uses GitHub;
- `gh api user` or `gh api repos/Hangi-n42/Growme_2026` fails;
- missing fetched `origin/main`;
- dirty worktree before mutable work;
- branch-preparer cannot create a local branch, empty commit, or requested remote push/delete probe;
- detached HEAD for `implementation-worker` or `pr-updater`;
- current branch is not prefixed with `codex/` for mutable implementation or PR update work;
- stale branch that does not include fetched `origin/main`;
- approval-required command in the planned job body;
- unknown changed surface that cannot be mapped to a narrow gate profile.
