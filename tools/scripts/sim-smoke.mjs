import { readText, runCheck } from "./lib/repo.mjs";

runCheck("sim-core command boundary exists", () => {
  const commands = readText("packages/sim-core/src/commands.ts");
  for (const expected of ["applyCommand", "advanceTime", "debugAddItem", "failed"]) {
    if (!commands.includes(expected)) {
      throw new Error(`Missing sim scaffold command marker: ${expected}`);
    }
  }
});

runCheck("sim-core records deterministic seed", () => {
  const state = readText("packages/sim-core/src/state.ts");
  if (!state.includes("seed: options.seed")) {
    throw new Error("Initial state does not retain deterministic seed.");
  }
});
