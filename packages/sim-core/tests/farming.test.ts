import { describe, expect, it } from "vitest";
import {
  FARM_ENERGY_COSTS,
  FARM_TILE_STATES,
  applyCommand,
  createInitialState,
  deserializeState,
  getItemQuantity,
  replayCommands,
  selectFarmTile,
  selectFarmTiles,
  serializeState,
  type GameCommand,
  type GameState
} from "../src";

function withSeeds(state: GameState, quantity: number): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      inventory: {
        ...state.player.inventory,
        turnip_seed: quantity
      }
    }
  };
}

function applyOk(state: GameState, command: unknown): GameState {
  const result = applyCommand(state, command);

  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.state;
}

function tileAt(state: GameState, x: number, y: number) {
  const tile = selectFarmTile(state, x, y);

  expect(tile).toBeDefined();

  if (tile === undefined) {
    throw new Error(`Missing farm tile at ${x},${y}.`);
  }

  return tile;
}

function growReadyTurnipState(): GameState {
  let state = withSeeds(createInitialState({ seed: "ready-turnip" }), 1);

  state = applyOk(state, { type: "TILL_TILE", x: 0, y: 0 });
  state = applyOk(state, { type: "PLANT_CROP", x: 0, y: 0, seedItemId: "turnip_seed" });
  state = applyOk(state, { type: "WATER_CROP", x: 0, y: 0 });
  state = applyOk(state, { type: "SLEEP_TO_NEXT_DAY" });
  state = applyOk(state, { type: "WATER_CROP", x: 0, y: 0 });

  return applyOk(state, { type: "SLEEP_TO_NEXT_DAY" });
}

describe("farm grid and crop lifecycle", () => {
  it("creates a deterministic farm grid with blocked and untilled tiles", () => {
    const state = createInitialState({ seed: "farm-grid" });

    expect(state.farm.width).toBe(4);
    expect(state.farm.height).toBe(3);
    expect(selectFarmTiles(state)).toHaveLength(12);
    expect(tileAt(state, 0, 0).state).toBe(FARM_TILE_STATES.UNTILLED);
    expect(tileAt(state, 3, 2).state).toBe(FARM_TILE_STATES.BLOCKED);
  });

  it("tills, plants, waters, grows, and harvests a crop transactionally", () => {
    let state = withSeeds(createInitialState({ seed: "farm-life" }), 1);

    state = applyOk(state, { type: "TILL_TILE", x: 0, y: 0 });
    expect(tileAt(state, 0, 0).state).toBe(FARM_TILE_STATES.TILLED);
    expect(state.player.energy).toBe(100 - FARM_ENERGY_COSTS.till);

    state = applyOk(state, { type: "PLANT_CROP", x: 0, y: 0, seedItemId: "turnip_seed" });
    expect(tileAt(state, 0, 0)).toMatchObject({
      state: FARM_TILE_STATES.PLANTED,
      cropId: "turnip",
      seedItemId: "turnip_seed",
      harvestItemId: "turnip_crop",
      plantedDay: 1,
      growthDaysWatered: 0
    });
    expect(getItemQuantity(state.player.inventory, "turnip_seed")).toBe(0);
    expect(state.player.energy).toBe(100 - FARM_ENERGY_COSTS.till - FARM_ENERGY_COSTS.plant);

    state = applyOk(state, { type: "WATER_CROP", x: 0, y: 0 });
    expect(tileAt(state, 0, 0)).toMatchObject({
      state: FARM_TILE_STATES.WATERED,
      wateredOnDay: 1
    });

    state = applyOk(state, { type: "SLEEP_TO_NEXT_DAY" });
    expect(state.day).toBe(2);
    expect(state.player.energy).toBe(100);
    expect(tileAt(state, 0, 0)).toMatchObject({
      state: FARM_TILE_STATES.PLANTED,
      growthDaysWatered: 1
    });

    state = applyOk(state, { type: "WATER_CROP", x: 0, y: 0 });
    state = applyOk(state, { type: "SLEEP_TO_NEXT_DAY" });
    expect(tileAt(state, 0, 0)).toMatchObject({
      state: FARM_TILE_STATES.READY,
      readyDay: 3,
      growthDaysWatered: 2
    });

    state = applyOk(state, { type: "HARVEST_CROP", x: 0, y: 0 });
    expect(getItemQuantity(state.player.inventory, "turnip_crop")).toBe(1);
    expect(tileAt(state, 0, 0)).toEqual({ x: 0, y: 0, state: FARM_TILE_STATES.TILLED });
    expect(state.player.energy).toBe(100 - FARM_ENERGY_COSTS.harvest);
  });

  it("rejects planting without a seed and leaves the farm unchanged", () => {
    const tilled = applyOk(createInitialState({ seed: "missing-seed" }), {
      type: "TILL_TILE",
      x: 0,
      y: 0
    });

    const result = applyCommand(tilled, {
      type: "PLANT_CROP",
      x: 0,
      y: 0,
      seedItemId: "turnip_seed"
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(tilled);
    expect(tileAt(tilled, 0, 0).state).toBe(FARM_TILE_STATES.TILLED);

    if (!result.ok) {
      expect(result.failure.code).toBe("INVENTORY_TRANSACTION_FAILED");
      expect(result.events[0]?.type).toBe("COMMAND_FAILED");
    }
  });

  it("only waters valid planted unwatered crops and does not spend energy on failures", () => {
    let state = withSeeds(createInitialState({ seed: "water-valid" }), 1);

    state = applyOk(state, { type: "TILL_TILE", x: 0, y: 0 });
    state = applyOk(state, { type: "PLANT_CROP", x: 0, y: 0, seedItemId: "turnip_seed" });

    const watered = applyCommand(state, { type: "WATER_CROP", x: 0, y: 0 });
    expect(watered.ok).toBe(true);

    if (watered.ok) {
      expect(watered.state.player.energy).toBe(state.player.energy - FARM_ENERGY_COSTS.water);

      const secondWater = applyCommand(watered.state, { type: "WATER_CROP", x: 0, y: 0 });
      expect(secondWater.ok).toBe(false);
      expect(secondWater.state).toBe(watered.state);

      if (!secondWater.ok) {
        expect(secondWater.failure.code).toBe("FARM_TILE_NOT_WATERABLE");
      }
    }

    const invalidTile = applyCommand(createInitialState({ seed: "water-invalid" }), {
      type: "WATER_CROP",
      x: 0,
      y: 0
    });
    expect(invalidTile.ok).toBe(false);
    expect(invalidTile.state.player.energy).toBe(100);
  });

  it("does not grow crops unless their watering requirement is met", () => {
    let state = withSeeds(createInitialState({ seed: "dry-crop" }), 1);

    state = applyOk(state, { type: "TILL_TILE", x: 0, y: 0 });
    state = applyOk(state, { type: "PLANT_CROP", x: 0, y: 0, seedItemId: "turnip_seed" });
    state = applyOk(state, { type: "SLEEP_TO_NEXT_DAY" });

    expect(tileAt(state, 0, 0)).toMatchObject({
      state: FARM_TILE_STATES.PLANTED,
      growthDaysWatered: 0
    });
  });

  it("does not duplicate harvest output on repeated harvest attempts", () => {
    let state = growReadyTurnipState();

    state = applyOk(state, { type: "HARVEST_CROP", x: 0, y: 0 });

    const duplicateHarvest = applyCommand(state, { type: "HARVEST_CROP", x: 0, y: 0 });

    expect(duplicateHarvest.ok).toBe(false);
    expect(duplicateHarvest.state).toBe(state);
    expect(getItemQuantity(state.player.inventory, "turnip_crop")).toBe(1);

    if (!duplicateHarvest.ok) {
      expect(duplicateHarvest.failure.code).toBe("CROP_NOT_READY");
    }
  });

  it("clears blocked farm tiles and rejects out-of-bounds coordinates", () => {
    let state = createInitialState({ seed: "clear-blocked" });

    state = applyOk(state, { type: "CLEAR_TILE", x: 3, y: 2 });
    expect(tileAt(state, 3, 2)).toEqual({ x: 3, y: 2, state: FARM_TILE_STATES.UNTILLED });
    expect(state.player.energy).toBe(100 - FARM_ENERGY_COSTS.clear);

    const outOfBounds = applyCommand(state, { type: "TILL_TILE", x: 4, y: 0 });

    expect(outOfBounds.ok).toBe(false);
    expect(outOfBounds.state).toBe(state);

    if (!outOfBounds.ok) {
      expect(outOfBounds.failure.code).toBe("INVALID_TILE_COORDINATES");
    }
  });

  it("replays farming commands deterministically and roundtrips farm state through saves", () => {
    const initialState = withSeeds(createInitialState({ seed: "farm-replay" }), 1);
    const commands = [
      { type: "TILL_TILE", x: 0, y: 0 },
      { type: "PLANT_CROP", x: 0, y: 0, seedItemId: "turnip_seed" },
      { type: "WATER_CROP", x: 0, y: 0 },
      { type: "SLEEP_TO_NEXT_DAY" },
      { type: "WATER_CROP", x: 0, y: 0 },
      { type: "SLEEP_TO_NEXT_DAY" }
    ] satisfies readonly GameCommand[];

    const first = replayCommands({ initialState, commands });
    const second = replayCommands({ initialState, commands });

    expect(JSON.stringify(first.finalState)).toBe(JSON.stringify(second.finalState));
    expect(JSON.stringify(first.events)).toBe(JSON.stringify(second.events));
    expect(tileAt(first.finalState, 0, 0).state).toBe(FARM_TILE_STATES.READY);
    expect(deserializeState(serializeState(first.finalState))).toEqual(first.finalState);
  });
});
