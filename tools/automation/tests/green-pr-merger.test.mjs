import { describe, expect, it } from "vitest";

import { evaluateReviewFindingsFromBodies } from "../green-pr-merger.mjs";

describe("green PR merger review finding evaluation", () => {
  it("ignores P0/P1 markers in resolved review threads", () => {
    const decision = evaluateReviewFindingsFromBodies([
      {
        source: "review comment 3489871002",
        body: "[P1] stale finding",
        reviewThread: {
          isResolved: true,
          isOutdated: false
        }
      }
    ]);

    expect(decision.reasons).toEqual([]);
  });

  it("ignores P0/P1 markers in outdated review threads", () => {
    const decision = evaluateReviewFindingsFromBodies([
      {
        source: "review comment 3489871002",
        body: "severity/p0 stale finding",
        reviewThread: {
          isResolved: false,
          isOutdated: true
        }
      }
    ]);

    expect(decision.reasons).toEqual([]);
  });

  it("blocks active review thread P0/P1 markers", () => {
    const decision = evaluateReviewFindingsFromBodies([
      {
        source: "review comment 123",
        body: "P1 active finding",
        reviewThread: {
          isResolved: false,
          isOutdated: false
        }
      }
    ]);

    expect(decision.reasons).toEqual(["unresolved P0/P1 marker found in review comment 123"]);
  });

  it("keeps issue comment P0/P1 markers as blockers", () => {
    const decision = evaluateReviewFindingsFromBodies([
      {
        source: "issue comment 456",
        body: "P1 manual blocker"
      }
    ]);

    expect(decision.reasons).toEqual(["unresolved P0/P1 marker found in issue comment 456"]);
  });

  it("keeps P2 findings non-blocking", () => {
    const decision = evaluateReviewFindingsFromBodies([
      {
        source: "review comment 789",
        body: "P2 follow-up",
        reviewThread: {
          isResolved: true,
          isOutdated: true
        }
      }
    ]);

    expect(decision.reasons).toEqual([]);
    expect(decision.p2Findings).toEqual([
      {
        source: "review comment 789",
        body: "P2 follow-up"
      }
    ]);
  });
});
