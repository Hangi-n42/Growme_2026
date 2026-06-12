import { listFiles, readJson, readText, runCheck } from "./lib/repo.mjs";

const protectedWorkflowCommands = [
  "pnpm check:protected-files",
  "pnpm check:no-test-skip",
  "pnpm check:no-quality-threshold-lowering",
  "pnpm eval:quality"
];

const workspacePackages = [
  "package.json",
  "apps/game-web/package.json",
  "packages/sim-core/package.json",
  "packages/content-schema/package.json",
  "tools/content-validator/package.json",
  "tools/economy-sim/package.json",
  "tools/npc-sim/package.json",
  "tools/quality-eval/package.json"
];

runCheck("protected files exist and do not disable gates", () => {
  const workflow = readText(".github/workflows/quality-gate.yml");
  const qualityBar = readText("QUALITY_BAR.md");
  const gates = readText("quality-gates.yml");

  if (workflow.includes("continue-on-error: true")) {
    throw new Error("Quality workflow must not continue on error.");
  }

  if (!qualityBar.includes("Quality thresholds may only tighten")) {
    throw new Error("Protected quality threshold policy is missing.");
  }

  if (!gates.includes("protected_decisions:") || !gates.includes("release_candidate_gates:")) {
    throw new Error("quality-gates.yml must keep protected decisions and release-candidate gates visible.");
  }

  for (const command of protectedWorkflowCommands) {
    if (!workflow.includes(command)) {
      throw new Error(`Quality workflow must run protected command: ${command}.`);
    }
  }
});

runCheck("forbidden gameplay dependency drift is protected", () => {
  for (const manifestPath of workspacePackages) {
    const manifest = readJson(manifestPath);
    const dependencies = {
      ...(manifest.dependencies ?? {}),
      ...(manifest.devDependencies ?? {})
    };

    for (const dependencyName of Object.keys(dependencies)) {
      if (dependencyName.toLowerCase().includes("pixi")) {
        throw new Error(`${manifestPath} declares forbidden dependency ${dependencyName}.`);
      }
    }
  }

  const simCoreSources = listFiles().filter(
    (file) => file.startsWith("packages/sim-core/src/") && file.endsWith(".ts")
  );
  const forbiddenRuntimePatterns = ["phaser", "localStorage", "document.", "window.", "fetch(", "Math.random", "Date.now"];

  for (const path of simCoreSources) {
    const text = readText(path);

    for (const pattern of forbiddenRuntimePatterns) {
      if (text.includes(pattern)) {
        throw new Error(`${path} contains forbidden sim-core runtime dependency ${pattern}.`);
      }
    }
  }
});
