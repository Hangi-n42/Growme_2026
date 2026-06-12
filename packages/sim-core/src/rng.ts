import type { SeedState } from "./types";

const UINT32_RANGE = 0x1_0000_0000;
const FNV_OFFSET_BASIS = 0x811c_9dc5;
const FNV_PRIME = 0x0100_0193;
const LCG_MULTIPLIER = 1_664_525;
const LCG_INCREMENT = 1_013_904_223;
const NON_ZERO_SEED_FALLBACK = 0x9e37_79b9;

export interface RandomRoll {
  readonly state: SeedState;
  readonly value: number;
}

export function createSeedState(seed: string): SeedState {
  return {
    seed,
    value: hashSeed(seed),
    rolls: 0
  };
}

export function hashSeed(seed: string): number {
  let hash = FNV_OFFSET_BASIS;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }

  return hash === 0 ? NON_ZERO_SEED_FALLBACK : hash;
}

export function nextRandom(seedState: SeedState): RandomRoll {
  const nextValue = (Math.imul(seedState.value, LCG_MULTIPLIER) + LCG_INCREMENT) >>> 0;

  return {
    state: {
      seed: seedState.seed,
      value: nextValue,
      rolls: seedState.rolls + 1
    },
    value: nextValue / UINT32_RANGE
  };
}

export function nextRandomInt(
  seedState: SeedState,
  minInclusive: number,
  maxExclusive: number
): RandomRoll {
  if (
    !Number.isInteger(minInclusive) ||
    !Number.isInteger(maxExclusive) ||
    maxExclusive <= minInclusive
  ) {
    throw new Error("Random integer bounds must be integers with max greater than min.");
  }

  const roll = nextRandom(seedState);
  const span = maxExclusive - minInclusive;

  return {
    state: roll.state,
    value: Math.floor(roll.value * span) + minInclusive
  };
}
