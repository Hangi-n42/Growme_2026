import type { ItemQuantity, RecipeDefinition } from "@growme/sim-core";

export const DEFAULT_RECIPE_ROI_BOUNDS = {
  min: 0.75,
  max: 1.15
} as const;

export interface EconomySimSummary {
  readonly days: number;
  readonly infiniteMoneyLoops: number;
  readonly progressionDeadlocks: number;
  readonly recipeValueViolations: number;
}

export interface RecipeValueItem {
  readonly id: string;
  readonly basePrice: number;
}

export interface RecipeValueBounds {
  readonly min: number;
  readonly max: number;
}

export interface RecipeValueEvaluation {
  readonly recipeId: string;
  readonly inputValue: number;
  readonly outputValue: number;
  readonly roi: number;
  readonly ok: boolean;
}

export function runEconomyScaffoldSim(days: number): EconomySimSummary {
  return {
    days,
    infiniteMoneyLoops: 0,
    progressionDeadlocks: 0,
    recipeValueViolations: 0
  };
}

export function evaluateRecipeValueBounds(
  recipes: readonly RecipeDefinition[],
  items: readonly RecipeValueItem[],
  bounds: RecipeValueBounds = DEFAULT_RECIPE_ROI_BOUNDS
): readonly RecipeValueEvaluation[] {
  const itemPrices = new Map(items.map((item) => [item.id, item.basePrice]));

  return recipes.map((recipe) => {
    const inputValue = calculateItemQuantityValue(recipe.inputs, itemPrices);
    const outputValue = calculateItemQuantityValue(recipe.outputs, itemPrices);
    const roi = outputValue / inputValue;

    return {
      recipeId: recipe.id,
      inputValue,
      outputValue,
      roi,
      ok: roi >= bounds.min && roi <= bounds.max
    };
  });
}

function calculateItemQuantityValue(
  itemQuantities: readonly ItemQuantity[],
  itemPrices: ReadonlyMap<string, number>
): number {
  let total = 0;

  for (const itemQuantity of itemQuantities) {
    const basePrice = itemPrices.get(itemQuantity.itemId);
    if (basePrice === undefined) {
      throw new Error(`Unknown recipe item id: ${itemQuantity.itemId}.`);
    }

    total += basePrice * itemQuantity.quantity;
  }

  return total;
}
