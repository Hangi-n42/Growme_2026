import { readJson, readText, runCheck } from "./lib/repo.mjs";

const contractPath = "docs/automation/unattended-pipeline.md";

const requiredContractText = [
  "green-pr-merger",
  "issue-worker",
  "branch-preparer",
  "workspace-verifier",
  "implementation-worker",
  "pr-updater",
  "GITHUB_TOKEN",
  "GH_TOKEN",
  "growme_gh_token.txt",
  "GH_TOKEN_PRESENT",
  "gh api user",
  "gh api repos/Hangi-n42/Growme_2026",
  "github-token-preflight.mjs",
  "--probe-remote-push",
  "Default Implementation Path",
  "git fetch origin main",
  "git switch -c codex/<issue-slug> origin/main",
  "git add",
  "git commit",
  "git push",
  "gh pr create",
  "gh pr merge",
  "Issue Metadata Policy",
  "Pre-implementation issue label/comment writes are not required gates",
  "Approval-Free Shell Contract",
  "continuing mutable work from detached HEAD",
  "named local branch with prefix `codex/`",
  "temporary `codex/__automation_preflight_probe_*` branch",
  "Gate Profiles",
  "node tools/scripts/automation-contract.mjs",
  "node tools/scripts/automation-preflight.mjs",
  "node tools/scripts/automation-gate-plan.mjs",
  "node tools/scripts/github-token-preflight.mjs",
  "COREPACK_HOME"
];

const requiredScripts = [
  "check:automation-contract",
  "check:automation-preflight",
  "check:automation-gate-plan",
  "check:github-token"
];

runCheck("unattended automation contract documents fail-fast rules", () => {
  const contract = readText(contractPath);

  for (const text of requiredContractText) {
    if (!contract.includes(text)) {
      throw new Error(`${contractPath} is missing required automation contract text: ${text}`);
    }
  }
});

runCheck("automation scripts are wired in package.json", () => {
  const packageJson = readJson("package.json");

  for (const scriptName of requiredScripts) {
    if (typeof packageJson.scripts?.[scriptName] !== "string") {
      throw new Error(`package.json is missing ${scriptName}`);
    }
  }
});

runCheck("automation contract is wired into quality policy", () => {
  const gates = readText("quality-gates.yml");
  const workflow = readText(".github/workflows/quality-gate.yml");
  const agents = readText("AGENTS.md");

  for (const requiredText of [
    "automation_pipeline_gates:",
    "green_pr_merger_scope: merge_only",
    "github_token_preflight: gh_api_required",
    "branch_preparer_git_write_probe: required",
    "token_backed_git_publication: required",
    "named_codex_branch_for_mutable_work: required",
    "detached_head_mutable_work: forbidden",
    "workspace_verifier_scope: local_ref_verification_only",
    "pre_implementation_github_writes: allowed_after_branch_setup",
    "partial_write_policy: report_metadata_failures_without_blocking"
  ]) {
    if (!gates.includes(requiredText)) {
      throw new Error(`quality-gates.yml is missing ${requiredText}`);
    }
  }

  if (!workflow.includes("pnpm check:automation-contract")) {
    throw new Error(".github/workflows/quality-gate.yml must run pnpm check:automation-contract.");
  }

  if (!agents.includes(contractPath)) {
    throw new Error(`AGENTS.md must reference ${contractPath}.`);
  }
});
