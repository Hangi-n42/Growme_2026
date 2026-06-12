import { readText, runCheck } from "./lib/repo.mjs";

runCheck("economy invariants are documented in gates", () => {
  const gates = readText("quality-gates.yml");
  for (const expected of [
    "infinite_money_loop_count: 0",
    "progression_deadlock_count: 0",
    "vendor_buy_multiplier_min: 0.35",
    "vendor_sell_multiplier_min: 1.00"
  ]) {
    if (!gates.includes(expected)) {
      throw new Error(`Missing economy gate: ${expected}`);
    }
  }
});
