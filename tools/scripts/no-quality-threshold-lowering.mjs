import { readText, runCheck } from "./lib/repo.mjs";

const requiredThresholds = [
  "infinite_money_loop_count: 0",
  "progression_deadlock_count: 0",
  "core_gameplay_placeholder_rectangles: 0",
  "vendor_buy_multiplier_min: 0.35",
  "vendor_buy_multiplier_max: 0.60",
  "vendor_sell_multiplier_min: 1.00",
  "vendor_sell_multiplier_max: 1.50",
  "desktop_boot_to_first_playable_ms_max: 3000"
];

runCheck("quality thresholds have not been lowered from scaffold baseline", () => {
  const gates = readText("quality-gates.yml");

  for (const threshold of requiredThresholds) {
    if (!gates.includes(threshold)) {
      throw new Error(`Missing protected threshold: ${threshold}`);
    }
  }

  if (gates.includes("optional")) {
    throw new Error("Release gates must not be marked optional in quality-gates.yml.");
  }
});
