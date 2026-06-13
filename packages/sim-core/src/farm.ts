import {
  FARM_TILE_STATES,
  type CropDefinition,
  type CropId,
  type FarmState,
  type FarmTile,
  type ItemId
} from "./types";
import type { ItemStackLimitLookup } from "./inventory";
import { TOOL_ACTION_ENERGY_COSTS } from "./energy";

export const DEFAULT_FARM_WIDTH = 4;
export const DEFAULT_FARM_HEIGHT = 3;
export const DEFAULT_FARM_ITEM_STACK_LIMIT = 99;

export const FARM_ENERGY_COSTS = {
  till: TOOL_ACTION_ENERGY_COSTS.till.energyCost,
  plant: TOOL_ACTION_ENERGY_COSTS.plant.energyCost,
  water: TOOL_ACTION_ENERGY_COSTS.water.energyCost,
  harvest: TOOL_ACTION_ENERGY_COSTS.harvest.energyCost,
  clear: TOOL_ACTION_ENERGY_COSTS.clear.energyCost
} as const;

export const DEFAULT_CROP_DEFINITIONS: readonly CropDefinition[] = [
  {
    id: "turnip",
    seedItemId: "turnip_seed",
    harvestItemId: "turnip_crop",
    growthDays: 2,
    harvestQuantity: 1,
    requiresWater: true,
    postHarvestTileState: FARM_TILE_STATES.TILLED
  }
];

export interface FarmTileCoordinate {
  readonly x: number;
  readonly y: number;
}

export interface CreateFarmStateOptions {
  readonly width?: number;
  readonly height?: number;
  readonly blockedTiles?: readonly FarmTileCoordinate[];
  readonly cropDefinitions?: readonly CropDefinition[];
}

export interface FarmDayTransitionChange {
  readonly day: number;
  readonly x: number;
  readonly y: number;
  readonly cropId: CropId;
  readonly previousState: FarmTile["state"];
  readonly nextState: FarmTile["state"];
  readonly growthDaysWatered: number;
}

export interface FarmDayTransitionResult {
  readonly farm: FarmState;
  readonly changes: readonly FarmDayTransitionChange[];
}

export function createInitialFarmState(options: CreateFarmStateOptions = {}): FarmState {
  const width = options.width ?? DEFAULT_FARM_WIDTH;
  const height = options.height ?? DEFAULT_FARM_HEIGHT;

  if (!Number.isSafeInteger(width) || width < 1) {
    throw new Error("Farm width must be a positive safe integer.");
  }

  if (!Number.isSafeInteger(height) || height < 1) {
    throw new Error("Farm height must be a positive safe integer.");
  }

  const blockedTiles = new Set(
    (options.blockedTiles ?? [{ x: width - 1, y: height - 1 }]).map(tileCoordinateKey)
  );
  const tiles: FarmTile[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      tiles.push({
        x,
        y,
        state: blockedTiles.has(tileCoordinateKey({ x, y }))
          ? FARM_TILE_STATES.BLOCKED
          : FARM_TILE_STATES.UNTILLED
      });
    }
  }

  return {
    width,
    height,
    tiles,
    cropDefinitions: options.cropDefinitions ?? DEFAULT_CROP_DEFINITIONS
  };
}

export function findFarmTile(
  farm: FarmState,
  x: number,
  y: number
): FarmTile | undefined {
  return farm.tiles.find((tile) => tile.x === x && tile.y === y);
}

export function replaceFarmTile(farm: FarmState, nextTile: FarmTile): FarmState {
  return {
    ...farm,
    tiles: farm.tiles.map((tile) =>
      tile.x === nextTile.x && tile.y === nextTile.y ? nextTile : tile
    )
  };
}

export function getCropDefinition(
  farm: FarmState,
  cropId: CropId
): CropDefinition | undefined {
  return farm.cropDefinitions.find((crop) => crop.id === cropId);
}

export function getCropDefinitionForSeed(
  farm: FarmState,
  seedItemId: ItemId
): CropDefinition | undefined {
  return farm.cropDefinitions.find((crop) => crop.seedItemId === seedItemId);
}

export function getFarmItemStackLimits(farm: FarmState): ItemStackLimitLookup {
  const stackLimits: Record<ItemId, number> = {};

  for (const crop of farm.cropDefinitions) {
    stackLimits[crop.seedItemId] = DEFAULT_FARM_ITEM_STACK_LIMIT;
    stackLimits[crop.harvestItemId] = DEFAULT_FARM_ITEM_STACK_LIMIT;
  }

  return stackLimits;
}

export function createTilledFarmTile(tile: FarmTile): FarmTile {
  return {
    x: tile.x,
    y: tile.y,
    state: FARM_TILE_STATES.TILLED
  };
}

export function createPlantedFarmTile(
  tile: FarmTile,
  crop: CropDefinition,
  day: number
): FarmTile {
  return {
    x: tile.x,
    y: tile.y,
    state: FARM_TILE_STATES.PLANTED,
    cropId: crop.id,
    seedItemId: crop.seedItemId,
    harvestItemId: crop.harvestItemId,
    plantedDay: day,
    growthDaysWatered: 0
  };
}

export function createWateredFarmTile(tile: FarmTile, day: number): FarmTile {
  return {
    ...tile,
    state: FARM_TILE_STATES.WATERED,
    wateredOnDay: day
  };
}

export function createHarvestedFarmTile(tile: FarmTile, crop: CropDefinition): FarmTile {
  return {
    x: tile.x,
    y: tile.y,
    state: crop.postHarvestTileState
  };
}

export function createClearedFarmTile(tile: FarmTile): FarmTile {
  return {
    x: tile.x,
    y: tile.y,
    state: FARM_TILE_STATES.UNTILLED
  };
}

export function advanceFarmByCrossedDays(
  farm: FarmState,
  crossedDays: readonly number[]
): FarmDayTransitionResult {
  let nextFarm = farm;
  const changes: FarmDayTransitionChange[] = [];

  for (const day of crossedDays) {
    const result = advanceFarmOneDay(nextFarm, day);
    nextFarm = result.farm;
    changes.push(...result.changes);
  }

  return {
    farm: nextFarm,
    changes
  };
}

function advanceFarmOneDay(farm: FarmState, day: number): FarmDayTransitionResult {
  let changed = false;
  const changes: FarmDayTransitionChange[] = [];
  const tiles = farm.tiles.map((tile) => {
    const cropId = tile.cropId;

    if (cropId === undefined) {
      return tile;
    }

    const crop = getCropDefinition(farm, cropId);
    if (crop === undefined) {
      return tile;
    }

    const shouldAdvance =
      tile.state === FARM_TILE_STATES.WATERED ||
      (tile.state === FARM_TILE_STATES.PLANTED && crop.requiresWater === false);

    if (!shouldAdvance) {
      return tile;
    }

    const growthDaysWatered = (tile.growthDaysWatered ?? 0) + 1;
    const nextState =
      growthDaysWatered >= crop.growthDays
        ? FARM_TILE_STATES.READY
        : FARM_TILE_STATES.PLANTED;
    const nextTile =
      nextState === FARM_TILE_STATES.READY
        ? createReadyFarmTile(tile, growthDaysWatered, day)
        : createGrowingFarmTile(tile, growthDaysWatered);

    changed = true;
    changes.push({
      day,
      x: tile.x,
      y: tile.y,
      cropId,
      previousState: tile.state,
      nextState,
      growthDaysWatered
    });

    return nextTile;
  });

  return {
    farm: changed ? { ...farm, tiles } : farm,
    changes
  };
}

function createGrowingFarmTile(tile: FarmTile, growthDaysWatered: number): FarmTile {
  const { wateredOnDay: _wateredOnDay, readyDay: _readyDay, ...tileWithoutDayMarkers } = tile;

  return {
    ...tileWithoutDayMarkers,
    state: FARM_TILE_STATES.PLANTED,
    growthDaysWatered
  };
}

function createReadyFarmTile(
  tile: FarmTile,
  growthDaysWatered: number,
  readyDay: number
): FarmTile {
  const { wateredOnDay: _wateredOnDay, ...tileWithoutWaterMarker } = tile;

  return {
    ...tileWithoutWaterMarker,
    state: FARM_TILE_STATES.READY,
    growthDaysWatered,
    readyDay
  };
}

function tileCoordinateKey(coordinate: FarmTileCoordinate): string {
  return `${coordinate.x},${coordinate.y}`;
}
