import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { readText, repoRoot, runCheck } from "./lib/repo.mjs";

const tscPath = join(repoRoot, "node_modules", "typescript", "bin", "tsc");

if (existsSync(tscPath)) {
  const result = spawnSync(process.execPath, [tscPath, "-b"], {
    cwd: repoRoot,
    stdio: "inherit"
  });

  process.exitCode = result.status ?? 1;
} else {
  runCheck("scaffold TypeScript references exist", () => {
    for (const path of [
      "tsconfig.json",
      "packages/sim-core/tsconfig.json",
      "packages/content-schema/tsconfig.json",
      "apps/game-web/tsconfig.json"
    ]) {
      readText(path);
    }
  });

  runCheck("public sim-core exports exist", () => {
    const exportsText = readText("packages/sim-core/src/index.ts");
    for (const symbol of ["applyCommand", "createInitialState", "serializeState", "deserializeState"]) {
      if (!exportsText.includes(symbol)) {
        throw new Error(`sim-core index is missing ${symbol}.`);
      }
    }
  });
}
