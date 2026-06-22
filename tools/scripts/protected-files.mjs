import { listFiles, listWorkspacePackageManifests, readJson, readText, runCheck } from "./lib/repo.mjs";

const protectedWorkflowCommands = [
  "pnpm check:protected-files",
  "pnpm check:automation-contract",
  "pnpm check:no-test-skip",
  "pnpm check:no-quality-threshold-lowering",
  "pnpm eval:quality"
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

  if (
    !gates.includes("protected_decisions:") ||
    !gates.includes("release_candidate_gates:") ||
    !gates.includes("automation_pipeline_gates:")
  ) {
    throw new Error("quality-gates.yml must keep protected decisions and release-candidate gates visible.");
  }

  for (const command of protectedWorkflowCommands) {
    if (!workflow.includes(command)) {
      throw new Error(`Quality workflow must run protected command: ${command}.`);
    }
  }
});

runCheck("workspace package manifests are discovered from pnpm-workspace globs", () => {
  const workspacePackages = listWorkspacePackageManifests();

  for (const expectedManifest of [
    "package.json",
    "apps/game-web/package.json",
    "packages/sim-core/package.json",
    "packages/content-schema/package.json",
    "tools/quality-eval/package.json"
  ]) {
    if (!workspacePackages.includes(expectedManifest)) {
      throw new Error(`Workspace package manifest was not discovered: ${expectedManifest}.`);
    }
  }
});

runCheck("forbidden PixiJS dependency fixture manifests are rejected", () => {
  const fixtureManifests = [
    { path: "fixture-pixi/package.json", manifest: { dependencies: { pixi: "1.0.0" } }, expected: "pixi" },
    { path: "fixture-pixi-js/package.json", manifest: { devDependencies: { "pixi.js": "1.0.0" } }, expected: "pixi.js" },
    { path: "fixture-pixi-scope/package.json", manifest: { dependencies: { "@pixi/core": "1.0.0" } }, expected: "@pixi/core" }
  ];

  for (const { path, manifest, expected } of fixtureManifests) {
    const forbiddenDependencies = findForbiddenPixiDependencies(manifest);
    if (!forbiddenDependencies.includes(expected)) {
      throw new Error(`${path} fixture did not reject forbidden PixiJS dependency ${expected}.`);
    }
  }
});

runCheck("forbidden gameplay dependency drift is protected", () => {
  const workspacePackages = listWorkspacePackageManifests();

  for (const manifestPath of workspacePackages) {
    const manifest = readJson(manifestPath);
    for (const dependencyName of findForbiddenPixiDependencies(manifest)) {
      throw new Error(
        `${manifestPath} declares forbidden PixiJS dependency ${dependencyName}; protected decision pixijs_dependency: forbidden.`
      );
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

function findForbiddenPixiDependencies(manifest) {
  const dependencies = {
    ...(manifest.dependencies ?? {}),
    ...(manifest.devDependencies ?? {}),
    ...(manifest.optionalDependencies ?? {}),
    ...(manifest.peerDependencies ?? {})
  };

  return Object.keys(dependencies).filter((dependencyName) => isForbiddenPixiDependencyName(dependencyName));
}

function isForbiddenPixiDependencyName(dependencyName) {
  const lowerName = dependencyName.toLowerCase();
  return lowerName === "pixi" || lowerName === "pixi.js" || lowerName.startsWith("@pixi/");
}
