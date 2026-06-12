import { readText, runCheck } from "./lib/repo.mjs";

runCheck("first three days release requirement is documented", () => {
  const qualityBar = readText("QUALITY_BAR.md");
  const testPlan = readText("docs/test-plan.md");

  if (!qualityBar.includes("first 3 in-game days") || !testPlan.includes("First three days")) {
    throw new Error("First three days gate must be documented before implementation.");
  }
});
