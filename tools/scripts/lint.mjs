import { readJson, readText, runCheck } from "./lib/repo.mjs";

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

runCheck("workspace package manifests are valid", () => {
  for (const manifestPath of workspacePackages) {
    readJson(manifestPath);
  }
});

runCheck("sim-core does not import browser presentation dependencies", () => {
  for (const path of [
    "packages/sim-core/src/types.ts",
    "packages/sim-core/src/state.ts",
    "packages/sim-core/src/commands.ts",
    "packages/sim-core/src/save.ts",
    "packages/sim-core/src/index.ts"
  ]) {
    const text = readText(path).toLowerCase();
    if (text.includes("phaser") || text.includes("localstorage") || text.includes("document.")) {
      throw new Error(`${path} contains a browser or Phaser dependency.`);
    }
  }
});

runCheck("forbidden dependencies are absent", () => {
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
});

runCheck("root quality files are present", () => {
  for (const requiredPath of ["AGENTS.md", "QUALITY_BAR.md", "quality-gates.yml", "pnpm-workspace.yaml"]) {
    readText(requiredPath);
  }
});
