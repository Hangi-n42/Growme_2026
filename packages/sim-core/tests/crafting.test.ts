import { describe, expect, it } from "vitest";
import {
  FARM_TILE_STATES,
  applyCommand,
  createGameTime,
  createInitialState,
  deserializeState,
  replayCommands,
  selectFarmTile,
  serializeState,
  type GameCommand,
  type GameContentState,
  type GameState
} from "../src";

const CRAFTING_CONTENT: GameContentState = {
  itemStackLimits: {
    fieldstone: 99,
    wild_fiber: 99,
    repair_plank: 50,
    simple_stool: 10
  },
  recipes: [
    {
      id: "repair_plank_recipe",
      category: "utility",
      inputs: [
        { itemId: "fieldstone", quantity: 2 },
        { itemId: "wild_fiber", quantity: 1 }
      ],
      outputs: [{ itemId: "repair_plank", quantity: 1 }],
      craftMinutes: 15
    },
    {
      id: "simple_stool_recipe",
      category: "decor",
      inputs: [
        { itemId: "repair_plank", quantity: 1 },
        { itemId: "wild_fiber", quantity: 2 }
      ],
      outputs: [{ itemId: "simple_stool", quantity: 1 }],
      craftMinutes: 30,
      unlockFlagIds: ["workshop_intro_complete"]
    }
  ]
};

function createCraftingState(overrides: Partial<GameState> = {}): GameState {
  const state = createInitialState({ seed: "crafting-test" });

  return {
    ...state,
    ...overrides,
    player: {
      ...state.player,
      ...overrides.player,
      inventory: {
        ...state.player.inventory,
        ...overrides.player?.inventory
      }
    }
  };
}

function applyOk(state: GameState, command: unknown, content = CRAFTING_CONTENT): GameState {
  const result = applyCommand(state, command, { content });

  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.state;
}

describe("crafting commands", () => {
  it("crafts a recipe transactionally from validated content and applies craft time", () => {
    const state = createCraftingState({
      player: {
        ...createCraftingState().player,
        inventory: {
          fieldstone: 4,
          wild_fiber: 2
        }
      }
    });

    const result = applyCommand(
      state,
      {
        type: "CRAFT_RECIPE",
        recipeId: "repair_plank_recipe",
        quantity: 2
      },
      { content: CRAFTING_CONTENT }
    );

    expect(result.ok).toBe(true);

    if (result.ok) {
      const craftEvent = result.events[result.events.length - 1];

      expect(result.state.player.inventory).toEqual({
        repair_plank: 2
      });
      expect(result.state.time.elapsedMinutes).toBe(state.time.elapsedMinutes + 15);
      expect(result.state.day).toBe(state.day);
      expect(result.events.map((event) => event.type)).toEqual([
        "TIME_ADVANCED",
        "CRAFT_RECIPE_COMPLETED"
      ]);
      expect(craftEvent?.payload).toMatchObject({
        recipeId: "repair_plank_recipe",
        quantity: 2,
        craftMinutes: 15
      });
      expect(result.audit[0]?.type).toBe("command.applied");
    }
  });

  it("rejects insufficient recipe inputs without mutating state", () => {
    const state = createCraftingState({
      player: {
        ...createCraftingState().player,
        inventory: {
          fieldstone: 1,
          wild_fiber: 1
        }
      }
    });

    const result = applyCommand(
      state,
      {
        type: "CRAFT_RECIPE",
        recipeId: "repair_plank_recipe"
      },
      { content: CRAFTING_CONTENT }
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.state.time).toEqual(state.time);
    expect(state.player.inventory).toEqual({
      fieldstone: 1,
      wild_fiber: 1
    });
    expect(result.events[0]?.type).toBe("COMMAND_FAILED");

    if (!result.ok) {
      expect(result.failure.code).toBe("CRAFT_TRANSACTION_FAILED");
      expect(result.failure.payload.transactionCode).toBe("INSUFFICIENT_ITEM_QUANTITY");
    }
  });

  it("rejects locked, unknown, and invalid craft requests", () => {
    const state = createCraftingState({
      player: {
        ...createCraftingState().player,
        inventory: {
          repair_plank: 1,
          wild_fiber: 2
        }
      }
    });

    const locked = applyCommand(
      state,
      {
        type: "CRAFT_RECIPE",
        recipeId: "simple_stool_recipe"
      },
      { content: CRAFTING_CONTENT }
    );
    const unknown = applyCommand(
      state,
      {
        type: "CRAFT_RECIPE",
        recipeId: "missing_recipe"
      },
      { content: CRAFTING_CONTENT }
    );
    const invalidQuantity = applyCommand(
      state,
      {
        type: "craftRecipe",
        recipeId: "repair_plank_recipe",
        quantity: 0
      },
      { content: CRAFTING_CONTENT }
    );

    expect(locked.ok).toBe(false);
    expect(unknown.ok).toBe(false);
    expect(invalidQuantity.ok).toBe(false);

    if (!locked.ok) {
      expect(locked.failure.code).toBe("RECIPE_LOCKED");
      expect(locked.state).toBe(state);
    }

    if (!unknown.ok) {
      expect(unknown.failure.code).toBe("UNKNOWN_RECIPE");
      expect(unknown.state).toBe(state);
    }

    if (!invalidQuantity.ok) {
      expect(invalidQuantity.failure.code).toBe("INVALID_CRAFT_QUANTITY");
      expect(invalidQuantity.state).toBe(state);
    }
  });

  it("rolls back outputs that would exceed stack limits", () => {
    const limitedContent: GameContentState = {
      ...CRAFTING_CONTENT,
      itemStackLimits: {
        ...CRAFTING_CONTENT.itemStackLimits,
        repair_plank: 2
      }
    };
    const state = createCraftingState({
      player: {
        ...createCraftingState().player,
        inventory: {
          fieldstone: 2,
          wild_fiber: 1,
          repair_plank: 2
        }
      }
    });

    const result = applyCommand(
      state,
      {
        type: "CRAFT_RECIPE",
        recipeId: "repair_plank_recipe"
      },
      { content: limitedContent }
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(state.player.inventory).toEqual({
      fieldstone: 2,
      wild_fiber: 1,
      repair_plank: 2
    });

    if (!result.ok) {
      expect(result.failure.code).toBe("CRAFT_TRANSACTION_FAILED");
      expect(result.failure.payload.transactionCode).toBe("STACK_LIMIT_EXCEEDED");
    }
  });

  it("advances day rollover and farm growth when crafting crosses midnight", () => {
    let state = createCraftingState({
      player: {
        ...createCraftingState().player,
        inventory: {
          fieldstone: 2,
          turnip_seed: 1,
          wild_fiber: 1
        }
      }
    });

    state = applyOk(state, { type: "TILL_TILE", x: 0, y: 0 });
    state = applyOk(state, { type: "PLANT_CROP", x: 0, y: 0, seedItemId: "turnip_seed" });
    state = applyOk(state, { type: "WATER_CROP", x: 0, y: 0 });

    const lateTime = createGameTime(1, 23 * 60 + 50);
    state = {
      ...state,
      time: lateTime,
      day: lateTime.day,
      minute: lateTime.minuteOfDay
    };

    const result = applyCommand(
      state,
      {
        type: "CRAFT_RECIPE",
        recipeId: "repair_plank_recipe"
      },
      { content: CRAFTING_CONTENT }
    );

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.state.day).toBe(2);
      expect(result.state.minute).toBe(5);
      expect(selectFarmTile(result.state, 0, 0)).toMatchObject({
        state: FARM_TILE_STATES.PLANTED,
        growthDaysWatered: 1
      });
      expect(result.events.map((event) => event.type)).toEqual([
        "DAY_STARTED",
        "TIME_ADVANCED",
        "FARM_CROP_GROWTH_ADVANCED",
        "CRAFT_RECIPE_COMPLETED"
      ]);
    }
  });

  it("replays crafting deterministically and keeps crafted state serializable", () => {
    const commands: readonly GameCommand[] = [
      { type: "CRAFT_RECIPE", recipeId: "repair_plank_recipe" },
      { type: "craftRecipe", recipeId: "simple_stool_recipe" }
    ];
    const initialState = createCraftingState({
      flags: ["workshop_intro_complete"],
      player: {
        ...createCraftingState().player,
        inventory: {
          fieldstone: 2,
          repair_plank: 1,
          wild_fiber: 3
        }
      }
    });

    const first = replayCommands({ initialState, content: CRAFTING_CONTENT, commands });
    const second = replayCommands({ initialState, content: CRAFTING_CONTENT, commands });

    expect(JSON.stringify(first.finalState)).toBe(JSON.stringify(second.finalState));
    expect(JSON.stringify(first.events)).toBe(JSON.stringify(second.events));
    expect(first.failures).toEqual([]);
    expect(first.finalState.player.inventory).toEqual({
      repair_plank: 1,
      simple_stool: 1
    });
    expect(deserializeState(serializeState(first.finalState))).toEqual(first.finalState);
  });
});
