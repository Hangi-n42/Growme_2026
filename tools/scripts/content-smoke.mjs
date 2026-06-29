import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { listFiles, readJson, repoRoot, runCheck } from "./lib/repo.mjs";

const seedManifestPath = "packages/content-schema/content/npcs.seed.json";
const fixtureDirectory = "packages/content-schema/content/fixtures/";

const contentSchema = await loadContentSchemaPackage();
const { assertValidContentManifest, loadValidatedContentManifest, validateContentManifest } = contentSchema;

runCheck("content schema package exports runtime validation", () => {
  for (const [name, value] of Object.entries({
    assertValidContentManifest,
    loadValidatedContentManifest,
    validateContentManifest
  })) {
    if (typeof value !== "function") {
      throw new Error(`content schema package is missing exported function ${name}.`);
    }
  }
});

runCheck("v0.1 seed content manifest validates", () => {
  const manifest = readJson(seedManifestPath);
  const errors = validateContentManifest(manifest);

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  assertValidContentManifest(manifest);
  const loadedManifest = loadValidatedContentManifest(manifest);
  if (loadedManifest.schemaVersion !== 1) {
    throw new Error("Loaded content manifest did not preserve schemaVersion 1.");
  }
});

runCheck("malformed content fixtures fail with actionable messages", () => {
  const seedManifest = readJson(seedManifestPath);
  const fixtureFiles = listFiles().filter((file) => file.startsWith(fixtureDirectory) && file.endsWith(".fixture.json"));

  if (fixtureFiles.length < 5) {
    throw new Error("Expected at least 5 malformed fixture files.");
  }

  for (const fixtureFile of fixtureFiles) {
    const fixture = readJson(fixtureFile);
    const manifest = applyFixture(seedManifest, fixture.patches);
    const errors = validateContentManifest(manifest);

    if (errors.length === 0) {
      throw new Error(`${fixtureFile} unexpectedly passed validation.`);
    }

    for (const expectedError of fixture.expectedErrors) {
      if (!errors.some((error) => error.includes(expectedError))) {
        throw new Error(`${fixtureFile} did not report expected error: ${expectedError}\nActual:\n${errors.join("\n")}`);
      }
    }
  }
});

async function loadContentSchemaPackage() {
  const distIndexPath = join(repoRoot, "packages", "content-schema", "dist", "index.js");
  const tscPath = join(repoRoot, "node_modules", "typescript", "bin", "tsc");
  if (existsSync(tscPath)) {
    buildContentSchemaPackage();
  }

  if (!existsSync(distIndexPath)) {
    throw new Error("packages/content-schema/dist/index.js was not produced.");
  }

  return import(`${pathToFileURL(distIndexPath).href}?content-smoke=${Date.now()}`);
}

function buildContentSchemaPackage() {
  const tscPath = join(repoRoot, "node_modules", "typescript", "bin", "tsc");
  const result = spawnSync(process.execPath, [tscPath, "-b", "packages/content-schema/tsconfig.json"], {
    cwd: repoRoot,
    stdio: "inherit"
  });

  if ((result.status ?? 1) !== 0) {
    throw new Error("Failed to build packages/content-schema before content smoke validation.");
  }
}

function applyFixture(seedManifest, patches) {
  const manifest = JSON.parse(JSON.stringify(seedManifest));

  for (const patch of patches) {
    if (patch.op !== "replace" || !Array.isArray(patch.path) || patch.path.length === 0) {
      throw new Error(`Unsupported fixture patch: ${JSON.stringify(patch)}`);
    }

    let target = manifest;
    for (const segment of patch.path.slice(0, -1)) {
      target = target[segment];
    }

    target[patch.path.at(-1)] = patch.value;
  }

  return manifest;
}
