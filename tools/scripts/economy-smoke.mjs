import { readJson, readText, runCheck } from "./lib/repo.mjs";

const recipeRoiBounds = {
  min: 0.75,
  max: 1.15
};

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

runCheck("seed recipes stay within approved value bounds", () => {
  const manifest = readJson("packages/content-schema/content/npcs.seed.json");
  const items = new Map(manifest.items.map((item) => [item.id, item]));

  for (const recipe of manifest.recipes) {
    const inputValue = calculateItemQuantityValue(recipe.inputs, items);
    const outputValue = calculateItemQuantityValue(recipe.outputs, items);
    const roi = outputValue / inputValue;

    if (roi < recipeRoiBounds.min || roi > recipeRoiBounds.max) {
      throw new Error(
        `recipe ${recipe.id} output/input base price ROI ${roi.toFixed(2)} must be between ` +
          `${recipeRoiBounds.min.toFixed(2)} and ${recipeRoiBounds.max.toFixed(2)}.`
      );
    }
  }
});

function calculateItemQuantityValue(values, items) {
  let total = 0;

  for (const value of values) {
    const item = items.get(value.itemId);
    if (!item) {
      throw new Error(`recipe quantity references unknown item: ${value.itemId}`);
    }

    total += item.basePrice * value.quantity;
  }

  return total;
}
