# Unattended Codex Automation Pipeline

This contract keeps Codex automations deterministic when no human is present to approve shell
escalations, finish interactive auth, or repair partial GitHub state. Any automation that cannot
satisfy this contract must stop with a blocked result before implementation starts.

## Role Boundaries

Automations are single-purpose jobs. A job must not silently expand into another role.

| Role | Allowed work | Must not do |
| --- | --- | --- |
| `green-pr-merger` | List open PRs, inspect required check conclusions, merge PRs that already satisfy the release policy, and exit no-op when there are no open PRs. | MUST NOT select issues, add `codex-working`, create branches, edit files, run implementation gates, or create follow-up work unless the merge itself exposes a blocking P0/P1. |
| `issue-worker` | Select one ready issue, verify its requirements/non-goals/acceptance criteria/tests/quality gates/suggested agent, add `codex-working`, and write a Korean start comment. | MUST NOT edit files or create commits. |
| `branch-preparer` | Fetch `origin/main`, create or refresh one `codex/<issue-slug>` branch, and prove freshness. | MUST NOT modify issue labels after branch setup fails. |
| `implementation-worker` | Edit files only after issue selection, branch setup, and freshness preflight pass. | MUST NOT label issues, create branches, merge PRs, or continue from detached HEAD. |
| `pr-updater` | Re-run freshness checks, summarize gates, push an existing branch, and open/update a PR. | MUST NOT pick a new issue or widen implementation scope. |

If an automation starts as `green-pr-merger` and finds zero open PRs, the correct result is a short
no-op report. It must not fall through to issue selection or implementation.

## GitHub Access

Unattended jobs must use one non-interactive GitHub access mode from the start:

- GitHub Actions: `GITHUB_TOKEN`.
- Local automation runner: `GH_TOKEN` or `GITHUB_TOKEN`.
- Codex App connector flow: connector-first writes, with `CODEX_GITHUB_CONNECTOR=enabled` recorded
  for local preflight evidence when a shell script needs to validate the run.

Do not run `gh auth login` or `gh auth status` inside unattended job bodies. Those are human setup
commands. A missing token or connector is a preflight failure, not a retry loop.

## Preflight

Every unattended job must run the narrowest preflight for its role before doing mutable work.
Inside a Codex App unattended job body, run the guard scripts directly with `node` so the job does
not touch Corepack package-manager caches during startup:

```bash
node tools/scripts/automation-preflight.mjs --role=green-pr-merger
node tools/scripts/automation-preflight.mjs --role=issue-worker
node tools/scripts/automation-preflight.mjs --role=branch-preparer
node tools/scripts/automation-preflight.mjs --role=implementation-worker
node tools/scripts/automation-preflight.mjs --role=pr-updater
```

The `pnpm check:*` package scripts remain available for humans and CI. Do not invoke bare
`corepack pnpm ...` from Stage 0 or role preflight inside an unattended job body unless the command
also sets an approval-free `COREPACK_HOME` in that same shell invocation.

For the contract check, use `node tools/scripts/automation-contract.mjs`. For branch freshness, use
`node tools/scripts/branch-freshness.mjs`.

Implementation preflight requires:

- a named branch;
- branch name prefix `codex/`;
- fetched `origin/main`;
- `origin/main` is an ancestor of `HEAD`;
- clean worktree unless the caller passes `--allow-dirty` for a post-edit gate run.

Detached HEAD is allowed only for read-only inspection roles. It is forbidden for
`implementation-worker` and `pr-updater`.

## Partial Write Policy

Multi-step GitHub writes are transactional at the workflow level:

1. Add `codex-working`.
2. Add the Korean start comment.
3. Create or refresh the `codex/<issue-slug>` branch.
4. Run implementation preflight.

If any step fails:

- do not edit files;
- remove labels/comments that this job created when the connector or token can do so safely;
- otherwise write one Korean blocked comment if possible;
- exit blocked with the failed step name and the exact recovery action.

Partial state is worse than no work. An issue with `codex-working` and no valid branch must be
treated as blocked, not as implementation-ready.

## Approval-Free Shell Contract

Unattended job bodies must not depend on commands that require runtime approval. Anything that needs
network, GitHub auth, git metadata writes outside the workspace, package cache setup, browser
downloads, or other elevated access must be satisfied before the job body starts.

Allowed inside unattended job bodies:

- read-only repo inspection;
- repo-local guard scripts invoked directly through `node tools/scripts/*.mjs`;
- package scripts only after their package-manager cache access has already been proven
  approval-free for the same job body;
- connector-backed GitHub reads/writes;
- git commands that operate inside a prepared branch without requesting approval.

Blocked inside unattended job bodies:

- `gh auth login`;
- `gh auth status`;
- ad hoc `git switch` from detached HEAD;
- bare `corepack pnpm ...` startup guards that may touch the default Corepack cache;
- package install or cache bootstrap;
- repeated approval retries.

## Gate Profiles

Use touched-surface gates during implementation and full release gates for PR readiness.
For unattended gate planning, prefer direct `node` guard entrypoints:

```bash
node tools/scripts/automation-gate-plan.mjs
node tools/scripts/automation-gate-plan.mjs --full
```

Minimum touched-surface gates always include protected checks. Full release gates are the complete
`required_scripts` list from `quality-gates.yml`, mapped to approval-free `node tools/scripts/*.mjs`
commands for unattended runs. Gate profiles must only add coverage. They must not weaken
`QUALITY_BAR.md`, release thresholds, protected decisions, or required release-candidate gates.

## Required Fail-Fast Outcomes

An unattended automation must stop before implementation when it sees any of these states:

- no open PRs for `green-pr-merger`;
- missing non-interactive GitHub access for a role that writes to GitHub;
- detached HEAD for implementation or PR update work;
- stale branch that does not include fetched `origin/main`;
- failed label/comment/branch setup;
- approval-required command in the planned job body;
- unknown changed surface that cannot be mapped to a narrow gate profile.
