import { readJson, runCheck } from "./lib/repo.mjs";

runCheck("content seed IDs are unique", () => {
  const manifest = readJson("packages/content-schema/content/npcs.seed.json");
  const ids = new Set();

  for (const resident of manifest.residents) {
    if (ids.has(resident.id)) {
      throw new Error(`Duplicate resident id ${resident.id}.`);
    }

    ids.add(resident.id);
  }
});

runCheck("content schema package defines validation", () => {
  const manifest = readJson("packages/content-schema/content/npcs.seed.json");
  if (manifest.schemaVersion !== 1) {
    throw new Error("NPC seed content must use schemaVersion 1.");
  }
});
