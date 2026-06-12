import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { readText, repoRoot, runCheck } from "./lib/repo.mjs";

const vitestPath = join(repoRoot, "node_modules", "vitest", "vitest.mjs");

if (existsSync(vitestPath)) {
  const result = spawnSync(process.execPath, [vitestPath, "run", "packages/sim-core/tests"], {
    cwd: repoRoot,
    stdio: "inherit"
  });

  process.exitCode = result.status ?? 1;
} else {
  runCheck("unit scaffold has deterministic sim smoke test", () => {
    const testText = readText("packages/sim-core/tests/smoke.test.ts");
    for (const expected of [
      "replays the same seed and command sequence deterministically",
      "returns typed failures for invalid commands without changing state",
      "roundtrips save snapshots"
    ]) {
      if (!testText.includes(expected)) {
        throw new Error(`Missing unit smoke assertion: ${expected}`);
      }
    }
  });
}
