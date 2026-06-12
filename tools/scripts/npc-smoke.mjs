import { readJson, runCheck } from "./lib/repo.mjs";

runCheck("v0.1 NPC seed content meets scaffold minimum", () => {
  const manifest = readJson("packages/content-schema/content/npcs.seed.json");

  if (manifest.residents.length < 5) {
    throw new Error("At least 5 NPC residents are required for v0.1.");
  }

  for (const resident of manifest.residents) {
    for (const key of ["id", "homeLocationId", "scheduleId"]) {
      if (typeof resident[key] !== "string" || resident[key].length === 0) {
        throw new Error(`Resident ${resident.id ?? "unknown"} is missing ${key}.`);
      }
    }

    for (const key of ["displayName", "job"]) {
      const text = resident[key];
      if (
        typeof text !== "object" ||
        text === null ||
        typeof text.key !== "string" ||
        text.key.length === 0 ||
        typeof text.text !== "string" ||
        text.text.length === 0
      ) {
        throw new Error(`Resident ${resident.id ?? "unknown"} is missing localized ${key}.`);
      }
    }
  }
});
