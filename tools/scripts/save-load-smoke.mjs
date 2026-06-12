import { readText, runCheck } from "./lib/repo.mjs";

runCheck("save persistence scaffold serializes and validates snapshots", () => {
  const saveText = readText("packages/sim-core/src/save.ts");
  for (const expected of ["serializeState", "deserializeState", "Unsupported or invalid save snapshot"]) {
    if (!saveText.includes(expected)) {
      throw new Error(`Save scaffold missing ${expected}.`);
    }
  }
});
