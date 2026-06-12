import { readText, runCheck } from "./lib/repo.mjs";

runCheck("Phaser app shell dispatches sim-core commands through bridge", () => {
  const scene = readText("apps/game-web/src/scenes/BootScene.ts");
  const bridge = readText("apps/game-web/src/simBridge.ts");

  if (!scene.includes("dispatchSimCommand")) {
    throw new Error("BootScene must dispatch through simBridge.");
  }

  if (!bridge.includes("applyCommand")) {
    throw new Error("simBridge must call sim-core applyCommand.");
  }
});
