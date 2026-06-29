# Unattended Codex Automation Pipeline

This contract defines where unattended automation may run and what must happen when no human is
present to approve shell escalation, finish interactive auth, or repair partial GitHub state.

Codex App unattended job bodies may block shell network/socket operations such as `gh api`,
`gh pr list`, `gh pr merge`, `git fetch`, and `git push`. `GH_TOKEN` and `GITHUB_TOKEN` solve
authentication; they do not bypass the Codex App sandbox. GitHub remote operation automations
therefore default to external token-backed runners.

## Runner Ownership

| Automation | Default runner | Status in Codex App |
| --- | --- | --- |
| `green-pr-merger` | External token-backed runner, preferably GitHub Actions. | PAUSED/manual fallback only. |
| `dependency-triage` | External token-backed runner. | PAUSED/manual fallback only. |
| `review-feedback-follow-up` | External token-backed runner. | PAUSED/manual fallback only. |
| `release-candidate-evaluator` | External token-backed runner. | PAUSED/manual fallback only. |
| `autonomous-backlog-worker` | Codex App or Codex execution environment because code edits are required. | PAUSED or semi-automatic until approval-free network egress is proven. |
| `failed-pr-fixer` | Codex App or Codex execution environment because code edits are required. | PAUSED or semi-automatic until approval-free network egress is proven. |

External runners own GitHub remote mutations:

- `gh api`;
- `gh pr list`;
- `gh pr merge`;
- issue label/comment writes;
- PR comment/review inspection;
- release candidate evaluation comments;
- token-backed `git fetch` and `git push` when the automation needs remote Git state.

Codex App job bodies must not silently take over merge, triage, review-follow-up, or release
evaluation when those external runners are unavailable.

## Role Boundaries

Automations are single-purpose jobs. A job must not silently expand into another role.

| Role | Allowed work | Must not do |
| --- | --- | --- |
| `green-pr-merger` | Inspect existing PRs and squash merge exactly one eligible green PR in an external runner. | MUST NOT select issues, create branches, edit files, run implementation gates, or implement work. |
| `dependency-triage` | Update GitHub issue labels after completed dependency PRs in an external runner. | MUST NOT edit code, create branches, open PRs, or implement backlog items. |
| `review-feedback-follow-up` | Convert non-blocking P2 review feedback into follow-up issues in an external runner. | MUST NOT edit code, create branches, open PRs, or handle P0/P1 blockers. |
| `release-candidate-evaluator` | Evaluate only PRs labeled `release-candidate` in an external runner. | MUST NOT merge, implement unrelated work, or weaken release gates. |
| `issue-worker` | Select one ready issue and record the planned `codex/` branch name. | MUST NOT edit files, create commits, merge PRs, or require issue labels/comments before branch setup. |
| `branch-preparer` | Prove local Git metadata writes and branch creation are possible. | MUST NOT select issues, edit product files, leave probe branches behind, or require remote network by default. |
| `workspace-verifier` | Verify fetched `origin/main`, clean worktree, and local freshness before mutable work. | MUST NOT select issues, edit product files, or publish PRs. |
| `implementation-worker` | Edit files only on a named `codex/` branch after branch preparation and freshness checks pass. | MUST NOT continue from detached HEAD, merge PRs, or widen issue scope. |
| `pr-updater` | Re-run freshness checks, summarize gates, and publish an existing implementation branch only when network egress is approval-free. | MUST NOT pick a new issue, widen implementation scope, or merge PRs. |

If `green-pr-merger` finds zero eligible PRs, the correct result is no-op. It must not fall through
to issue selection or implementation.

## GitHub Access

Automation must use non-interactive token-backed GitHub access:

- GitHub Actions: prefer repository secret `GROWME_AUTOMATION_TOKEN`; otherwise use the workflow
  `GITHUB_TOKEN` when its permissions are sufficient.
- Local external runner: `GH_TOKEN` or `GITHUB_TOKEN`.
- Codex App local setup: may read `C:\Users\dsl\.codex\secrets\growme_gh_token.txt` into both
  `GH_TOKEN` and `GITHUB_TOKEN`, but this does not prove network egress.

The maintenance token file must not be loaded by default automation setup. Token values must never
be printed, committed, or copied into prompts.

Do not run these commands in unattended automation:

- `gh auth login`;
- `gh auth status`.

Token preflight must use API calls, not interactive auth commands:

```bash
node tools/scripts/github-token-preflight.mjs
node tools/scripts/external-runner-preflight.mjs
```

It must prove:

- `GH_TOKEN_PRESENT`;
- `gh api user`;
- `gh api repos/Hangi-n42/Growme_2026`.

## Fail-Fast Outcomes

- `BLOCKED_GITHUB_ACCESS`: no `GH_TOKEN` or `GITHUB_TOKEN`, or the token cannot authenticate.
- `BLOCKED_NETWORK_EGRESS`: a token is present, but network/socket access prevents reaching GitHub.
- `BLOCKED_APPROVAL_REQUIRED`: a command would require runtime approval or escalation.
- `BLOCKED_DETACHED_HEAD`: mutable implementation or PR update work is not on a named `codex/` branch.
- `BLOCKED_BRANCH_SETUP`: local Git metadata writes or branch creation failed.
- `NO_ACTION_NO_OPEN_PRS`: merger found no open implementation PRs.
- `NO_ACTION_NO_ELIGIBLE_GREEN_PR`: merger found open PRs but none satisfied merge policy.

`BLOCKED_NETWORK_EGRESS` is distinct from `BLOCKED_APPROVAL_REQUIRED`. The former means token
authentication is present but the runner cannot open a GitHub API or Git network connection. The
latter means the command requires an approval prompt and must not be retried by an unattended job.

## External Runner Path

GitHub remote operation automations use this default path:

1. Runner injects `GH_TOKEN` or `GITHUB_TOKEN`.
2. Run `node tools/scripts/external-runner-preflight.mjs`.
3. Run the specific automation script, for example:

   ```bash
   node tools/automation/green-pr-merger.mjs --dry-run
   ```

4. After dry-run is reviewed, run without dry-run or with `--merge` from the external runner.

The first implementation target is GitHub Actions for `green-pr-merger`. Windows Task Scheduler is
an acceptable fallback for local external execution if GitHub Actions cannot hold the required
token or permissions.

## Codex App Path

Codex App remains useful for code-writing tasks, but it is not the default host for fully unattended
GitHub operation automation.

Inside a Codex App job body:

- do not retry approval-gated commands;
- do not assume `GH_TOKEN` implies socket access;
- stop with `BLOCKED_NETWORK_EGRESS` if `gh api`, `git fetch`, or `git push` cannot reach GitHub;
- keep `autonomous-backlog-worker` and `failed-pr-fixer` PAUSED or semi-automatic until
  approval-free network egress has been proven for the job body;
- do not use connector publication as the default PR publication path.

If a Codex App sandbox still needs remote GitHub work, a connector may be used only as an explicit
fallback or manually approved alternate path. It is not the default publication or merge path.

## Preflight

Use the narrowest preflight for the runner and role.

For the repository contract check:

```bash
node tools/scripts/automation-contract.mjs
```

External GitHub operation runner:

```bash
node tools/scripts/external-runner-preflight.mjs
```

Codex App local role guards:

```bash
node tools/scripts/automation-preflight.mjs --role=issue-worker
node tools/scripts/automation-preflight.mjs --role=branch-preparer
node tools/scripts/automation-preflight.mjs --role=workspace-verifier
node tools/scripts/automation-preflight.mjs --role=implementation-worker
node tools/scripts/automation-preflight.mjs --role=pr-updater --allow-dirty
```

`automation-preflight.mjs` must not force remote GitHub API calls by default inside a Codex App job
body. Use `--github-write=required` only in a runner where network egress has already been approved.

`branch-preparer` creates a temporary `codex/__automation_preflight_probe_*` branch from
`origin/main`, creates an empty probe commit, switches back to the original branch or detached HEAD,
and deletes the local temporary branch. `--probe-remote-push` is explicit maintenance verification;
it pushes and deletes a temporary remote branch and must not be a Codex App default.

`implementation-worker` and `pr-updater` require a named local branch with prefix `codex/`. They
must not continue from detached HEAD. `--allow-detached` is reserved for read-only inspection or
explicit human-directed fallback and is not part of the default mutable path.

For gate planning, use:

```bash
node tools/scripts/automation-gate-plan.mjs
node tools/scripts/automation-gate-plan.mjs --full
```

## Issue Metadata Policy

Pre-implementation issue label/comment writes are not required gates.

`codex-working` labels and progress comments are advisory only. They may be attempted after branch
setup succeeds, but a label/comment failure must not block implementation when local branch setup has
already passed. Report skipped or failed metadata writes in the final response.

If issue selection, token preflight, branch preparation, network egress, or freshness verification
fails, stop before editing files and report a precise `BLOCKED_*` result.

## Gate Profiles

Use touched-surface gates during implementation and full release gates for PR readiness. Minimum
touched-surface gates always include protected checks. Gate profiles may only add coverage; they
must not weaken `QUALITY_BAR.md`, release thresholds, protected decisions, or required
release-candidate gates.
