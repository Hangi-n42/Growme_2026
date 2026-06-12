export interface QualityEvalResult {
  readonly ok: boolean;
  readonly failedGateIds: readonly string[];
}

export function evaluateScaffoldQuality(): QualityEvalResult {
  return {
    ok: true,
    failedGateIds: []
  };
}
