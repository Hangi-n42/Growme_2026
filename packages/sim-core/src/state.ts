import type { SimState } from "./types";

export interface CreateInitialStateOptions {
  readonly seed: string;
}

export function createInitialState(options: CreateInitialStateOptions): SimState {
  return {
    version: 1,
    seed: options.seed,
    day: 1,
    minute: 360,
    player: {
      energy: 100,
      wallet: 100,
      inventory: {}
    },
    flags: [],
    eventLog: []
  };
}
