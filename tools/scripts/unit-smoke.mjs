import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { readText, repoRoot, runCheck } from "./lib/repo.mjs";

const vitestPath = join(repoRoot, "node_modules", "vitest", "vitest.mjs");
const { createDependencyTriagePlan, parseDependencyReferences } = await import("../automation/dependency-triage.mjs");
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

  runCheck("dependency triage parses and unlocks closed dependencies", () => {
    const parsed = parseDependencyReferences("Dependencies:\n\n- #6\n- #9");
    const plan = createDependencyTriagePlan({
      issues: [
        noInstallIssue({ number: 6, title: "VS-004 Content foundation", state: "closed" }),
        noInstallIssue({ number: 9, title: "VS-007 Save/load", state: "closed" }),
        noInstallIssue({
          number: 29,
          title: "VS-027 Resource node and drop table system",
          body: "Dependencies:\n- #6\n- #9",
          labels: ["codex-blocked"]
        })
      ],
      openPrs: [],
      now: new Date("2026-06-29T00:00:00.000Z")
    });

    if (parsed.issueNumbers.join(",") !== "6,9" || plan.newlyCodexReadyPlanned[0]?.number !== 29) {
      throw new Error("Dependency triage must unlock blocked issues whose dependencies are closed.");
    }
  });

  runCheck("dependency triage keeps open dependencies blocked", () => {
    const plan = createDependencyTriagePlan({
      issues: [
        noInstallIssue({ number: 10, title: "VS-010 Open dependency" }),
        noInstallIssue({
          number: 40,
          title: "VS-040 Waiting issue",
          body: "Blocked by #10",
          labels: ["codex-blocked"]
        })
      ],
      openPrs: [],
      now: new Date("2026-06-29T00:00:00.000Z")
    });

    if (plan.newlyCodexReadyPlanned.length > 0 || plan.stillBlockedIssues[0]?.reason !== "open dependencies remain") {
      throw new Error("Dependency triage must not unlock issues with open dependencies.");
    }
  });

  runCheck("dependency triage keeps missing dependency sections blocked", () => {
    const explicitNone = parseDependencyReferences("Blocked by: 없음");
    const plan = createDependencyTriagePlan({
      issues: [
        noInstallIssue({
          number: 42,
          title: "VS-040 Playwright first day test",
          body: "Acceptance Criteria:\n- Build the test",
          labels: ["codex-blocked"]
        })
      ],
      openPrs: [],
      now: new Date("2026-06-29T00:00:00.000Z")
    });

    if (!explicitNone.explicitNone || plan.stillBlockedIssues[0]?.reason !== "missing dependency section") {
      throw new Error("Dependency triage must not unlock codex-blocked issues without a dependency section.");
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

function noInstallIssue({ number, title, state = "open", labels = [], body = "", updatedAt = "2026-06-28T00:00:00.000Z" }) {
  return {
    number,
    title,
    state,
    body,
    updated_at: updatedAt,
    html_url: `https://example.test/issues/${number}`,
    labels: labels.map((name) => ({ name }))
  };
}
