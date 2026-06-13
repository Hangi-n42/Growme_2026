import { FARM_TILE_STATES, GAME_STATE_VERSION, type FarmState, type GameState } from "./types";

export function serializeState(state: GameState): string {
  return JSON.stringify(state);
}

export function deserializeState(serialized: string): GameState {
  const parsed = JSON.parse(serialized) as unknown;

  if (!isGameStateSnapshot(parsed)) {
    throw new Error("Unsupported or invalid save snapshot.");
  }

  return parsed;
}

function isGameStateSnapshot(value: unknown): value is GameState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const state = value as Partial<GameState>;

  return (
    state.version === GAME_STATE_VERSION &&
    typeof state.contentVersion === "string" &&
    typeof state.seed === "string" &&
    typeof state.day === "number" &&
    typeof state.minute === "number" &&
    typeof state.rng === "object" &&
    state.rng !== null &&
    typeof state.time === "object" &&
    state.time !== null &&
    typeof state.time.day === "number" &&
    typeof state.time.minuteOfDay === "number" &&
    typeof state.time.elapsedMinutes === "number" &&
    typeof state.player === "object" &&
    state.player !== null &&
    isFarmStateSnapshot(state.farm) &&
    Array.isArray(state.flags) &&
    Array.isArray(state.eventLog) &&
    Array.isArray(state.auditLog) &&
    typeof state.commandLog === "object" &&
    state.commandLog !== null
  );
}

function isFarmStateSnapshot(value: unknown): value is FarmState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const farm = value as Partial<FarmState>;

  return (
    typeof farm.width === "number" &&
    typeof farm.height === "number" &&
    Array.isArray(farm.tiles) &&
    farm.tiles.every(isFarmTileSnapshot) &&
    Array.isArray(farm.cropDefinitions)
  );
}

function isFarmTileSnapshot(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const tile = value as { readonly x?: unknown; readonly y?: unknown; readonly state?: unknown };
  const states = new Set<string>(Object.values(FARM_TILE_STATES));

  return (
    typeof tile.x === "number" &&
    typeof tile.y === "number" &&
    typeof tile.state === "string" &&
    states.has(tile.state)
  );
}
