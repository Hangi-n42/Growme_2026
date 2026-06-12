import { createSeedState } from "./rng";
import { createGameTime } from "./time";
import {
  DEFAULT_CONTENT_VERSION,
  DEFAULT_MAX_ENERGY,
  DEFAULT_START_MINUTE,
  GAME_STATE_VERSION,
  type GameState
} from "./types";

export interface CreateInitialStateOptions {
  readonly seed: string;
  readonly contentVersion?: string;
  readonly startDay?: number;
  readonly startMinute?: number;
}

export function createInitialGameState(options: CreateInitialStateOptions): GameState {
  const time = createGameTime(options.startDay ?? 1, options.startMinute ?? DEFAULT_START_MINUTE);

  return {
    version: GAME_STATE_VERSION,
    contentVersion: options.contentVersion ?? DEFAULT_CONTENT_VERSION,
    seed: options.seed,
    rng: createSeedState(options.seed),
    time,
    day: time.day,
    minute: time.minuteOfDay,
    player: {
      energy: DEFAULT_MAX_ENERGY,
      wallet: 100,
      inventory: {}
    },
    flags: [],
    eventLog: [],
    auditLog: [],
    commandLog: {
      nextSequence: 0,
      appliedCount: 0
    }
  };
}

export const createInitialState = createInitialGameState;
