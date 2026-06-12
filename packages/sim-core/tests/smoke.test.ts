import { describe, expect, it } from "vitest";
import {
  applyCommand,
  createInitialState,
  createSeedState,
  deserializeState,
  nextRandomInt,
  replayCommands,
  serializeState,
  type GameCommand
} from "../src";

describe("sim-core deterministic command foundation", () => {
  it("replays the same seed and command sequence deterministically", () => {
    const commands: readonly GameCommand[] = [
      { type: "NOOP" },
      { type: "ADVANCE_TIME", minutes: 30 },
      { type: "ADVANCE_TIME", minutes: 1_410 }
    ];

    const first = replayCommands({ seed: "replay-seed", commands });
    const second = replayCommands({ seed: "replay-seed", commands });

    expect(JSON.stringify(first.finalState)).toBe(JSON.stringify(second.finalState));
    expect(JSON.stringify(first.events)).toBe(JSON.stringify(second.events));
    expect(JSON.stringify(first.audit)).toBe(JSON.stringify(second.audit));
    expect(first.finalState.day).toBe(2);
    expect(first.finalState.minute).toBe(360);
  });

  it("applies commands deterministically", () => {
    const state = createInitialState({ seed: "smoke" });

    const first = applyCommand(state, { type: "ADVANCE_TIME", minutes: 30 });
    const second = applyCommand(state, { type: "ADVANCE_TIME", minutes: 30 });

    expect(first).toEqual(second);
    expect(first.ok).toBe(true);

    if (first.ok) {
      expect(first.state.day).toBe(1);
      expect(first.state.minute).toBe(390);
      expect(first.state.time.minuteOfDay).toBe(390);
      expect(first.state.eventLog).toHaveLength(1);
      expect(first.state.auditLog).toHaveLength(1);
      expect(first.events[0]?.type).toBe("TIME_ADVANCED");
      expect(first.audit[0]?.type).toBe("command.applied");
    }
  });

  it("returns typed failures for invalid commands without changing state", () => {
    const state = createInitialState({ seed: "invalid" });

    const result = applyCommand(state, { type: "ADVANCE_TIME", minutes: 0 });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.events[0]?.type).toBe("COMMAND_FAILED");
    expect(result.audit[0]?.type).toBe("command.rejected");

    if (!result.ok) {
      expect(result.failure.code).toBe("INVALID_ADVANCE_TIME_MINUTES");
      expect(result.error).toBe("ADVANCE_TIME requires a positive safe integer minute count.");
    }
  });

  it("rejects unknown command shapes without mutating state", () => {
    const state = createInitialState({ seed: "unknown" });

    const result = applyCommand(state, { type: "DEBUG_ADD_ITEM", itemId: "fiber", quantity: 1 });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);

    if (!result.ok) {
      expect(result.failure.code).toBe("UNKNOWN_COMMAND");
    }
  });

  it("roundtrips save snapshots", () => {
    const state = createInitialState({ seed: "save-smoke" });
    const advanced = applyCommand(state, { type: "ADVANCE_TIME", minutes: 45 }).state;

    expect(deserializeState(serializeState(advanced))).toEqual(advanced);
  });

  it("provides deterministic seeded random rolls without mutating input state", () => {
    const seedState = createSeedState("rng-seed");
    const first = nextRandomInt(seedState, 1, 10);
    const second = nextRandomInt(seedState, 1, 10);

    expect(first).toEqual(second);
    expect(seedState.rolls).toBe(0);
    expect(first.state.rolls).toBe(1);
    expect(first.value).toBeGreaterThanOrEqual(1);
    expect(first.value).toBeLessThan(10);
  });
});
