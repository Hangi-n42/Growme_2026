import { createSeedState } from "./rng";
import { createGameTime } from "./time";
import { createInitialFarmState } from "./farm";
import {
  DEFAULT_CONTENT_VERSION,
  DEFAULT_MAX_ENERGY,
  DEFAULT_START_MINUTE,
  GAME_STATE_VERSION,
  type ContractsState,
  type DecorState,
  type GameState,
  type MineState,
  type NpcMemoryState,
  type RelationshipsState,
  type ShopsState,
  type StoryState
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
    farm: createInitialFarmState(),
    mine: createInitialMineState(time.day),
    shops: createInitialShopsState(),
    contracts: createInitialContractsState(),
    npcs: createInitialNpcMemoryState(),
    relationships: createInitialRelationshipsState(),
    story: createInitialStoryState(),
    decor: createInitialDecorState(),
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

export function createInitialMineState(day: number): MineState {
  return {
    deepestFloorReached: 1,
    daily: {
      day,
      floor: 1,
      depletedNodeIds: [],
      exitRevealed: false
    }
  };
}

export function createInitialShopsState(): ShopsState {
  return {
    shops: []
  };
}

export function createInitialContractsState(): ContractsState {
  return {
    active: [],
    completedIds: [],
    cooldowns: []
  };
}

export function createInitialNpcMemoryState(): NpcMemoryState {
  return {
    metNpcIds: [],
    memoryFlags: []
  };
}

export function createInitialRelationshipsState(): RelationshipsState {
  return {
    affinity: [],
    dailyGains: [],
    milestoneFlags: []
  };
}

export function createInitialStoryState(): StoryState {
  return {
    completedEventIds: [],
    flags: []
  };
}

export function createInitialDecorState(): DecorState {
  return {
    placements: []
  };
}
