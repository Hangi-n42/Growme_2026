import { describe, expect, it } from "vitest";

import { createDependencyTriagePlan, parseDependencyReferences } from "../dependency-triage.mjs";

const now = new Date("2026-06-29T00:00:00.000Z");

describe("dependency triage dependency parsing", () => {
  it("parses dependency references from supported dependency sections", () => {
    expect(
      parseDependencyReferences(`
        ## Dependencies
        - Depends on #6
        - Blocked by #9 and #28
      `)
    ).toEqual({
      issueNumbers: [6, 9, 28],
      ambiguous: false,
      explicitNone: false
    });
  });

  it("keeps ambiguous dependency sections blocked", () => {
    expect(
      parseDependencyReferences(`
        Dependencies
        - VS-004 must be complete first
      `)
    ).toEqual({
      issueNumbers: [],
      ambiguous: true,
      explicitNone: false
    });
  });

  it("treats explicit no-dependency sections as unblocked", () => {
    expect(parseDependencyReferences("Blocked by: none")).toEqual({
      issueNumbers: [],
      ambiguous: false,
      explicitNone: true
    });
  });
});

describe("dependency triage planning", () => {
  it("plans closed codex-working cleanup and blocked issue unlocks without mutating", () => {
    const plan = createDependencyTriagePlan({
      issues: [
        issue({ number: 6, title: "VS-004 Content foundation", state: "closed" }),
        issue({ number: 9, title: "VS-007 Save/load", state: "closed" }),
        issue({
          number: 29,
          title: "VS-027 Resource node and drop table system",
          body: "Dependencies:\n- #6\n- #9",
          labels: ["codex-blocked"]
        }),
        issue({ number: 31, title: "VS-029 Closed cleanup", state: "closed", labels: ["codex-working"] })
      ],
      openPrs: [],
      now
    });

    expect(plan.labelsToRemove).toEqual([
      expect.objectContaining({
        number: 31,
        label: "codex-working"
      })
    ]);
    expect(plan.newlyCodexReadyPlanned).toEqual([
      expect.objectContaining({
        number: 29,
        dependencies: [
          expect.objectContaining({ number: 6, state: "closed" }),
          expect.objectContaining({ number: 9, state: "closed" })
        ]
      })
    ]);
  });

  it("reports open dependencies and stale codex-working without unlocking", () => {
    const plan = createDependencyTriagePlan({
      issues: [
        issue({ number: 10, title: "VS-010 Open dependency" }),
        issue({
          number: 40,
          title: "VS-040 Waiting issue",
          body: "Blocked by #10",
          labels: ["codex-blocked"]
        }),
        issue({
          number: 41,
          title: "VS-041 Claimed issue",
          labels: ["codex-working"],
          updatedAt: "2026-06-26T00:00:00.000Z"
        })
      ],
      openPrs: [],
      now,
      staleWorkingHours: 48
    });

    expect(plan.newlyCodexReadyPlanned).toEqual([]);
    expect(plan.stillBlockedIssues).toEqual([
      expect.objectContaining({
        number: 40,
        reason: "open dependencies remain",
        openDependencies: [expect.objectContaining({ number: 10, state: "open" })]
      })
    ]);
    expect(plan.codexWorkingStaleCandidates).toEqual([
      expect.objectContaining({
        number: 41
      })
    ]);
  });
});

function issue({ number, title, state = "open", labels = [], body = "", updatedAt = "2026-06-28T00:00:00.000Z" }) {
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
