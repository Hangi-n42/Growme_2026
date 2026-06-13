export interface QualityEvalResult {
  readonly ok: boolean;
  readonly releaseCandidateBlocked: boolean;
  readonly status: "pass" | "blocked" | "fail";
  readonly failedGateIds: readonly string[];
  readonly scaffoldedGateIds: readonly string[];
  readonly gates: readonly QualityGateStatus[];
}

export interface QualityGateStatus {
  readonly id: string;
  readonly area:
    | "determinism"
    | "economy_integrity"
    | "boundary_integrity"
    | "scope_integrity"
    | "player_loop"
    | "stability"
    | "visual_readiness"
    | "protected_thresholds";
  readonly status: "pass" | "scaffolded_blocker" | "fail";
  readonly summary: string;
}

const scaffoldedReleaseCandidateGates: readonly QualityGateStatus[] = [
  {
    id: "rc.first_3_days_playable",
    area: "player_loop",
    status: "scaffolded_blocker",
    summary: "Release candidate still needs automated first-three-days gameplay evidence."
  },
  {
    id: "rc.economy_integrity",
    area: "economy_integrity",
    status: "scaffolded_blocker",
    summary: "Release candidate still needs 7-day and 30-day economy simulations with zero loops or deadlocks."
  },
  {
    id: "rc.visual_placeholder_audit",
    area: "visual_readiness",
    status: "scaffolded_blocker",
    summary: "Release candidate still needs proof that core gameplay placeholder rectangles are gone."
  }
];

export function evaluateScaffoldQuality(): QualityEvalResult {
  const failedGateIds = scaffoldedReleaseCandidateGates
    .filter((gate) => gate.status === "fail")
    .map((gate) => gate.id);
  const scaffoldedGateIds = scaffoldedReleaseCandidateGates
    .filter((gate) => gate.status === "scaffolded_blocker")
    .map((gate) => gate.id);
  const releaseCandidateBlocked = scaffoldedGateIds.length > 0;
  const status = failedGateIds.length > 0 ? "fail" : releaseCandidateBlocked ? "blocked" : "pass";

  return {
    ok: status === "pass",
    releaseCandidateBlocked,
    status,
    failedGateIds,
    scaffoldedGateIds,
    gates: scaffoldedReleaseCandidateGates
  };
}
