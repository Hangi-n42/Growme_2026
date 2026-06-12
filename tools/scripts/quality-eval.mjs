import { readText, runCheck } from "./lib/repo.mjs";

runCheck("quality eval release gates are represented", () => {
  const gates = readText("quality-gates.yml");
  const qualityBar = readText("QUALITY_BAR.md");

  for (const expected of [
    "runtime_llm_dialogue: forbidden",
    "pixijs_dependency: forbidden",
    "first_3_days_playable: required",
    "core_gameplay_placeholder_rectangles: 0"
  ]) {
    if (!gates.includes(expected)) {
      throw new Error(`Missing quality gate: ${expected}`);
    }
  }

  if (!qualityBar.includes("The quality bar is a release contract")) {
    throw new Error("QUALITY_BAR.md must define release-contract expectations.");
  }
});
