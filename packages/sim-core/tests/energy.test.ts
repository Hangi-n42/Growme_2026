import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_ENERGY,
  FARM_ENERGY_COSTS,
  GAME_EVENT_TYPES,
  TOOL_ACTION_CATEGORIES,
  TOOL_ACTION_ENERGY_COSTS,
  applyCommand,
  checkToolActionEnergy,
  createInitialState,
  restoreDailyEnergy,
  type GameState,
  type ToolActionKind
} from "../src";

function withEnergy(state: GameState, energy: number): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      energy
    }
  };
}

describe("tool action energy", () => {
  it("defines deterministic energy costs for farm, gathering, mine, clearing, and hazards", () => {
    expect(TOOL_ACTION_ENERGY_COSTS).toMatchObject({
      till: { category: TOOL_ACTION_CATEGORIES.FARM, energyCost: FARM_ENERGY_COSTS.till },
      plant: { category: TOOL_ACTION_CATEGORIES.FARM, energyCost: FARM_ENERGY_COSTS.plant },
      water: { category: TOOL_ACTION_CATEGORIES.FARM, energyCost: FARM_ENERGY_COSTS.water },
      harvest: { category: TOOL_ACTION_CATEGORIES.FARM, energyCost: FARM_ENERGY_COSTS.harvest },
      clear: { category: TOOL_ACTION_CATEGORIES.CLEAR, energyCost: FARM_ENERGY_COSTS.clear },
      gather: { category: TOOL_ACTION_CATEGORIES.GATHER, energyCost: 5 },
      mine: { category: TOOL_ACTION_CATEGORIES.MINE, energyCost: 7 },
      hazard: { category: TOOL_ACTION_CATEGORIES.HAZARD, energyCost: 10 }
    });

    for (const [actionKind, definition] of Object.entries(TOOL_ACTION_ENERGY_COSTS) as [
      ToolActionKind,
      (typeof TOOL_ACTION_ENERGY_COSTS)[ToolActionKind]
    ][]) {
      const failed = checkToolActionEnergy({ energy: definition.energyCost - 1 }, actionKind);
      const passed = checkToolActionEnergy({ energy: definition.energyCost }, actionKind);

      expect(failed.ok).toBe(false);
      if (!failed.ok) {
        expect(failed).toMatchObject({
          actionKind,
          actionCategory: definition.category,
          requiredEnergy: definition.energyCost,
          deficit: 1
        });
      }

      expect(passed.ok).toBe(true);
      if (passed.ok) {
        expect(passed.remainingEnergy).toBe(0);
      }
    }
  });

  it("fails tool actions transactionally and emits exhaustion detail when energy is insufficient", () => {
    const state = withEnergy(
      createInitialState({ seed: "tool-energy-exhaustion" }),
      FARM_ENERGY_COSTS.till - 1
    );
    const result = applyCommand(state, { type: "TILL_TILE", x: 0, y: 0 });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.state.player.energy).toBe(FARM_ENERGY_COSTS.till - 1);
    expect(result.events.map((event) => event.type)).toEqual([
      GAME_EVENT_TYPES.COMMAND_FAILED,
      GAME_EVENT_TYPES.PLAYER_EXHAUSTED
    ]);

    if (!result.ok) {
      expect(result.failure).toMatchObject({
        code: "INSUFFICIENT_ENERGY",
        payload: {
          actionKind: "till",
          actionCategory: TOOL_ACTION_CATEGORIES.FARM,
          energy: FARM_ENERGY_COSTS.till - 1,
          requiredEnergy: FARM_ENERGY_COSTS.till,
          deficit: 1,
          maxEnergy: DEFAULT_MAX_ENERGY
        }
      });
      expect(result.events[0]?.payload).toMatchObject(result.failure.payload);
      expect(result.events[1]?.category).toBe("player");
    }
  });

  it("allows exact-cost actions to spend to zero and restores daily energy on sleep", () => {
    const state = withEnergy(createInitialState({ seed: "tool-energy-zero" }), FARM_ENERGY_COSTS.till);
    const tillResult = applyCommand(state, { type: "TILL_TILE", x: 0, y: 0 });

    expect(tillResult.ok).toBe(true);

    if (tillResult.ok) {
      expect(tillResult.state.player.energy).toBe(0);
      expect(tillResult.events[0]?.payload).toMatchObject({
        actionKind: "till",
        actionCategory: TOOL_ACTION_CATEGORIES.FARM,
        energyCost: FARM_ENERGY_COSTS.till
      });
      expect(restoreDailyEnergy(tillResult.state.player).energy).toBe(DEFAULT_MAX_ENERGY);

      const sleepResult = applyCommand(tillResult.state, { type: "SLEEP_TO_NEXT_DAY" });
      expect(sleepResult.ok).toBe(true);

      if (sleepResult.ok) {
        expect(sleepResult.state.player.energy).toBe(DEFAULT_MAX_ENERGY);
      }
    }
  });
});
