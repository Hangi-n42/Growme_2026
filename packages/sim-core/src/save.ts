import type { SimState } from "./types";

export function serializeState(state: SimState): string {
  return JSON.stringify(state);
}

export function deserializeState(serialized: string): SimState {
  const parsed = JSON.parse(serialized) as Partial<SimState>;

  if (parsed.version !== 1 || typeof parsed.seed !== "string") {
    throw new Error("Unsupported or invalid save snapshot.");
  }

  return parsed as SimState;
}
