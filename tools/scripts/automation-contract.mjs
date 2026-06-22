import { readJson, readText, runCheck } from "./lib/repo.mjs";

const contractPath = "docs/automation/unattended-pipeline.md";

const requiredContractText = [
  "green-pr-merger",
  "issue-worker",
  "branch-preparer",
  "implementation-worker",
  "pr-updater",
  "GITHUB_TOKEN",
  "GH_TOKEN",
  "CODEX_GITHUB_CONNECTOR=enabled",
  "Detached HEAD",
  "Partial Write Policy",
  "Approval-Free Shell Contract",
  "Gate Profiles",
  "pnpm check:automation-preflight",
  "pnpm check:automation-gate-plan"
];

const requiredScripts = [
  "check:automation-contract",
  "check:automation-preflight",
  "check:automation-gate-plan"
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
    "partial_write_policy: rollback_or_blocked",
    "detached_head_implementation: forbidden"
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
