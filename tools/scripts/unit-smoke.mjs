import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { readText, repoRoot, runCheck } from "./lib/repo.mjs";

const vitestPath = join(repoRoot, "node_modules", "vitest", "vitest.mjs");
const { evaluateReviewFindingsFromBodies } = await import("../automation/green-pr-merger.mjs");

if (existsSync(vitestPath)) {
  const result = spawnSync(
    process.execPath,
    [vitestPath, "run", "packages/sim-core/tests", "tools/quality-eval/tests", "tools/automation/tests"],
    {
      cwd: repoRoot,
      stdio: "inherit"
    }
  );

  process.exitCode = result.status ?? 1;
} else {
  runCheck("green PR merger ignores inactive review thread blockers", () => {
    const resolvedDecision = evaluateReviewFindingsFromBodies([
      {
        source: "review comment 3489871002",
        body: "[P1] stale finding",
        reviewThread: {
          isResolved: true,
          isOutdated: false
        }
      }
    ]);
    const outdatedDecision = evaluateReviewFindingsFromBodies([
      {
        source: "review comment 3489871002",
        body: "severity/p0 stale finding",
        reviewThread: {
          isResolved: false,
          isOutdated: true
        }
      }
    ]);

    if (resolvedDecision.reasons.length > 0 || outdatedDecision.reasons.length > 0) {
      throw new Error("Resolved or outdated review thread comments must not block merge.");
    }
  });

  runCheck("green PR merger keeps active and issue-level P0/P1 blockers", () => {
    const activeDecision = evaluateReviewFindingsFromBodies([
      {
        source: "review comment 123",
        body: "P1 active finding",
        reviewThread: {
          isResolved: false,
          isOutdated: false
        }
      }
    ]);
    const issueDecision = evaluateReviewFindingsFromBodies([
      {
        source: "issue comment 456",
        body: "P1 manual blocker"
      }
    ]);

    if (
      activeDecision.reasons[0] !== "unresolved P0/P1 marker found in review comment 123" ||
      issueDecision.reasons[0] !== "unresolved P0/P1 marker found in issue comment 456"
    ) {
      throw new Error("Active review thread and issue comment blockers must still block merge.");
    }
  });

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
