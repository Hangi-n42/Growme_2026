import { readText, runCheck } from "./lib/repo.mjs";

runCheck("protected files exist and do not disable gates", () => {
  const workflow = readText(".github/workflows/quality-gate.yml");
  const qualityBar = readText("QUALITY_BAR.md");

  if (workflow.includes("continue-on-error: true")) {
    throw new Error("Quality workflow must not continue on error.");
  }

  if (!qualityBar.includes("Quality thresholds may only tighten")) {
    throw new Error("Protected quality threshold policy is missing.");
  }
});
