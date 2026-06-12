import { describe, expect, it } from "vitest";
import { applyCommand, createInitialState, deserializeState, serializeState } from "../src";

describe("sim-core scaffold", () => {
  it("applies commands deterministically", () => {
    const state = createInitialState({ seed: "smoke" });

    const first = applyCommand(state, { type: "advanceTime", minutes: 30 });
    const second = applyCommand(state, { type: "advanceTime", minutes: 30 });

    expect(first).toEqual(second);
    expect(first.state.day).toBe(1);
    expect(first.state.minute).toBe(390);
  });

  it("roundtrips save snapshots", () => {
    const state = createInitialState({ seed: "save-smoke" });
    const withItem = applyCommand(state, {
      type: "debugAddItem",
      itemId: "sample_fiber",
      quantity: 2
    }).state;

    expect(deserializeState(serializeState(withItem))).toEqual(withItem);
  });
});
