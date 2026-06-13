import { describe, expect, it } from "vitest";

import { evaluateScaffoldQuality } from "../src/index";

describe("evaluateScaffoldQuality", () => {
  it("reports scaffolded release-candidate gates as blockers instead of pass", () => {
    const result = evaluateScaffoldQuality();

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.releaseCandidateBlocked).toBe(true);
    expect(result.scaffoldedGateIds).toContain("rc.first_3_days_playable");
    expect(result.gates.some((gate) => gate.status === "scaffolded_blocker")).toBe(true);
  });
});
