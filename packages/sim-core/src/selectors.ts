import {
  GAME_EVENT_TYPES,
  type FarmTile,
  type GameCommandResult,
  type GameState,
  type GameTime,
  type GameTimePhase
} from "./types";
import { findFarmTile } from "./farm";
import { didTimeRangeCrossDay, getTimePhase } from "./time";

type GameTimeSource = GameState | GameTime;

export function selectCurrentDay(source: GameTimeSource): number {
  return selectGameTime(source).day;
}

export function selectMinuteOfDay(source: GameTimeSource): number {
  return selectGameTime(source).minuteOfDay;
}

export function selectTotalElapsedMinutes(source: GameTimeSource): number {
  return selectGameTime(source).elapsedMinutes;
}

export function selectTimePhase(source: GameTimeSource): GameTimePhase {
  return getTimePhase(selectGameTime(source));
}

export function didCommandCrossIntoNewDay(result: GameCommandResult): boolean {
  return result.events.some((event) => event.type === GAME_EVENT_TYPES.DAY_STARTED);
}

export function didTimeAdvanceCrossIntoNewDay(
  startTime: GameTime,
  endTime: GameTime
): boolean {
  return didTimeRangeCrossDay(startTime, endTime);
}

export function selectFarmTile(
  state: GameState,
  x: number,
  y: number
): FarmTile | undefined {
  return findFarmTile(state.farm, x, y);
}

export function selectFarmTiles(state: GameState): readonly FarmTile[] {
  return state.farm.tiles;
}

function selectGameTime(source: GameTimeSource): GameTime {
  return "time" in source ? source.time : source;
}
