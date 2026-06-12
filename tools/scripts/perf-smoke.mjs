import { readText, runCheck } from "./lib/repo.mjs";

runCheck("performance smoke thresholds are declared", () => {
  const gates = readText("quality-gates.yml");
  for (const expected of [
    "desktop_boot_to_first_playable_ms_max: 3000",
    "save_load_roundtrip_ms_max: 250",
    "average_frame_ms_max: 20"
  ]) {
    if (!gates.includes(expected)) {
      throw new Error(`Missing performance threshold: ${expected}`);
    }
  }
});
