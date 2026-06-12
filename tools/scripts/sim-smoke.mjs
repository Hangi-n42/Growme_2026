import { listFiles, readText, runCheck } from "./lib/repo.mjs";

const simCoreSources = listFiles().filter(
  (file) => file.startsWith("packages/sim-core/src/") && file.endsWith(".ts")
);

runCheck("sim-core command boundary exists", () => {
  const commands = readText("packages/sim-core/src/commands.ts");
  for (const expected of ["applyCommand", "reduceGameCommand", "NOOP", "ADVANCE_TIME", "command.failed"]) {
    if (!commands.includes(expected)) {
      throw new Error(`Missing sim scaffold command marker: ${expected}`);
    }
  }
});

runCheck("sim-core records deterministic seed", () => {
  const state = readText("packages/sim-core/src/state.ts");
  if (!state.includes("seed: options.seed") || !state.includes("rng: createSeedState(options.seed)")) {
    throw new Error("Initial state does not retain deterministic seed.");
  }
});

runCheck("sim-core exposes replay and RNG APIs", () => {
  const index = readText("packages/sim-core/src/index.ts");
  for (const expected of ["replayCommands", "createSeedState", "nextRandom", "nextRandomInt"]) {
    if (!index.includes(expected)) {
      throw new Error(`sim-core index is missing ${expected}.`);
    }
  }
});

runCheck("sim-core avoids nondeterministic runtime APIs", () => {
  const forbidden = ["Math.random", "Date.now", "new Date(", "performance.now", "fetch("];

  for (const file of simCoreSources) {
    const text = readText(file);

    for (const pattern of forbidden) {
      if (text.includes(pattern)) {
        throw new Error(`${file} contains nondeterministic or runtime API ${pattern}.`);
      }
    }
  }
});
