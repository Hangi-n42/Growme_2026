import { readText, runCheck } from "./lib/repo.mjs";

runCheck("save persistence scaffold serializes and validates snapshots", () => {
  const saveText = readText("packages/sim-core/src/save.ts");
  for (const expected of [
    "SAVE_SCHEMA_VERSION",
    "createSaveSnapshot",
    "tryDeserializeState",
    "migrateSaveSnapshot",
    "validateSaveSnapshot",
    "SaveValidationError"
  ]) {
    if (!saveText.includes(expected)) {
      throw new Error(`Save scaffold missing ${expected}.`);
    }
  }
});

runCheck("save persistence tests cover roundtrip and corrupted-load paths", () => {
  const testText = readText("packages/sim-core/tests/save.test.ts");
  for (const expected of [
    "roundtrips all persisted slices",
    "corrupted or incompatible saves",
    "migrates legacy raw GameState saves"
  ]) {
    if (!testText.includes(expected)) {
      throw new Error(`Save tests missing ${expected}.`);
    }
  }
});
