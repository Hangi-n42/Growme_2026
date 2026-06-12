import { readText, runCheck } from "./lib/repo.mjs";

runCheck("unit scaffold has deterministic sim smoke test", () => {
  const testText = readText("packages/sim-core/tests/smoke.test.ts");
  for (const expected of ["applies commands deterministically", "roundtrips save snapshots"]) {
    if (!testText.includes(expected)) {
      throw new Error(`Missing unit smoke assertion: ${expected}`);
    }
  }
});
