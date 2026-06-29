import { describe, expect, it } from "vitest";

import { applyDependencyTriagePlan, createDependencyTriagePlan, parseDependencyReferences } from "../dependency-triage.mjs";

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
      explicitNone: false,
      hasDependencySection: true
    });
  });

  it("parses dependency bullets after Markdown heading blanks", () => {
    expect(
      parseDependencyReferences(`
        ## Dependencies

        - #6
        - #9
      `)
    ).toEqual({
      issueNumbers: [6, 9],
      ambiguous: false,
      explicitNone: false,
      hasDependencySection: true
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
      explicitNone: false,
      hasDependencySection: true
    });
  });

  it("treats explicit no-dependency sections as unblocked", () => {
    expect(parseDependencyReferences("Blocked by: none")).toEqual({
      issueNumbers: [],
      ambiguous: false,
      explicitNone: true,
      hasDependencySection: true
    });
    expect(parseDependencyReferences("Blocked by: 없음")).toEqual({
      issueNumbers: [],
      ambiguous: false,
      explicitNone: true,
      hasDependencySection: true
    });
  });

  it("reports missing dependency sections separately from explicit no-dependency sections", () => {
    expect(parseDependencyReferences("Acceptance Criteria:\n- Done")).toEqual({
      issueNumbers: [],
      ambiguous: false,
      explicitNone: false,
      hasDependencySection: false
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

  it("keeps codex-blocked issues without dependency sections blocked", () => {
    const plan = createDependencyTriagePlan({
      issues: [
        issue({
          number: 42,
          title: "VS-040 Playwright first day test",
          body: "Acceptance Criteria:\n- Build the test",
          labels: ["codex-blocked"]
        })
      ],
      openPrs: [],
      now
    });

    expect(plan.newlyCodexReadyPlanned).toEqual([]);
    expect(plan.stillBlockedIssues).toEqual([
      expect.objectContaining({
        number: 42,
        reason: "missing dependency section"
      })
    ]);
  });

  it("keeps unknown dependency references blocked", () => {
    const plan = createDependencyTriagePlan({
      issues: [
        issue({
          number: 43,
          title: "VS-041 Playwright first 3 days test",
          body: "Dependencies:\n- #999999",
          labels: ["codex-blocked"]
        })
      ],
      openPrs: [],
      now
    });

    expect(plan.newlyCodexReadyPlanned).toEqual([]);
    expect(plan.stillBlockedIssues).toEqual([
      expect.objectContaining({
        number: 43,
        reason: "open dependencies remain",
        openDependencies: [expect.objectContaining({ number: 999999, state: "unknown" })]
      })
    ]);
  });

  it("adds codex-ready before removing codex-blocked during apply", () => {
    const calls = [];

    applyDependencyTriagePlan(
      {
        labelsToRemove: [],
        newlyCodexReadyPlanned: [issue({ number: 29, title: "VS-027 Resource node and drop table system" })]
      },
      {
        addIssueLabels(number, labels) {
          calls.push(["add", number, labels]);
        },
        removeIssueLabel(number, label) {
          calls.push(["remove", number, label]);
        }
      }
    );

    expect(calls).toEqual([
      ["add", 29, ["codex-ready"]],
      ["remove", 29, "codex-blocked"]
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
