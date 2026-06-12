import { applyCommand, type SimCommand, type SimResult, type SimState } from "@growme/sim-core";

export function dispatchSimCommand(state: SimState, command: SimCommand): SimResult {
  return applyCommand(state, command);
}
