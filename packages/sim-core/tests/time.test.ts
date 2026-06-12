import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_ENERGY,
  DEFAULT_START_MINUTE,
  MAX_TIME_ADVANCE_MINUTES,
  MINUTES_PER_DAY,
  TIME_PHASES,
  applyCommand,
  createInitialState,
  didCommandCrossIntoNewDay,
  didTimeAdvanceCrossIntoNewDay,
  replayCommands,
  selectCurrentDay,
  selectMinuteOfDay,
  selectTimePhase,
  selectTotalElapsedMinutes,
  type GameCommand
} from "../src";

describe("time and day cycle", () => {
  it("creates stable initial time state", () => {
    const state = createInitialState({ seed: "time-initial" });

    expect(state.time).toEqual({
      day: 1,
      minuteOfDay: DEFAULT_START_MINUTE,
      elapsedMinutes: DEFAULT_START_MINUTE
    });
    expect(selectCurrentDay(state)).toBe(1);
    expect(selectMinuteOfDay(state)).toBe(DEFAULT_START_MINUTE);
    expect(selectTotalElapsedMinutes(state)).toBe(DEFAULT_START_MINUTE);
    expect(selectTimePhase(state)).toBe(TIME_PHASES.MORNING);
  });

  it("advances time within the same day", () => {
    const state = createInitialState({ seed: "same-day" });
    const result = applyCommand(state, { type: "ADVANCE_TIME", minutes: 45 });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.state.time).toEqual({
        day: 1,
        minuteOfDay: DEFAULT_START_MINUTE + 45,
        elapsedMinutes: DEFAULT_START_MINUTE + 45
      });
      expect(result.events.map((event) => event.type)).toEqual(["TIME_ADVANCED"]);
      expect(didCommandCrossIntoNewDay(result)).toBe(false);
      expect(didTimeAdvanceCrossIntoNewDay(state.time, result.state.time)).toBe(false);
    }
  });

  it("emits day start when advancing across one day boundary", () => {
    const state = createInitialState({
      seed: "one-boundary",
      startMinute: MINUTES_PER_DAY - 10
    });
    const result = applyCommand(state, { type: "ADVANCE_TIME", minutes: 15 });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.state.time).toEqual({
        day: 2,
        minuteOfDay: 5,
        elapsedMinutes: MINUTES_PER_DAY + 5
      });
      expect(result.events.map((event) => event.type)).toEqual(["DAY_STARTED", "TIME_ADVANCED"]);
      expect(result.events[0]?.time).toEqual({
        day: 2,
        minuteOfDay: 0,
        elapsedMinutes: MINUTES_PER_DAY
      });
      expect(result.events[1]?.payload).toMatchObject({
        minutes: 15,
        crossedDayCount: 1,
        crossedDays: [2]
      });
      expect(didCommandCrossIntoNewDay(result)).toBe(true);
      expect(didTimeAdvanceCrossIntoNewDay(state.time, result.state.time)).toBe(true);
    }
  });

  it("advances across multiple day boundaries deterministically", () => {
    const state = createInitialState({ seed: "multi-boundary" });
    const result = applyCommand(state, {
      type: "ADVANCE_TIME",
      minutes: MINUTES_PER_DAY * 3 + 25
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.state.time).toEqual({
        day: 4,
        minuteOfDay: DEFAULT_START_MINUTE + 25,
        elapsedMinutes: DEFAULT_START_MINUTE + MINUTES_PER_DAY * 3 + 25
      });
      expect(result.events.map((event) => event.type)).toEqual([
        "DAY_STARTED",
        "DAY_STARTED",
        "DAY_STARTED",
        "TIME_ADVANCED"
      ]);
      expect(result.events.map((event) => event.sequence)).toEqual([0, 1, 2, 3]);
      expect(result.events[3]?.payload).toMatchObject({
        crossedDayCount: 3,
        crossedDays: [2, 3, 4]
      });
    }
  });

  it("rejects negative time advancement without mutating state", () => {
    const state = createInitialState({ seed: "negative-time" });
    const result = applyCommand(state, { type: "ADVANCE_TIME", minutes: -1 });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(state.eventLog).toHaveLength(0);

    if (!result.ok) {
      expect(result.failure.code).toBe("INVALID_ADVANCE_TIME_MINUTES");
      expect(result.events[0]?.type).toBe("COMMAND_FAILED");
    }
  });

  it("rejects non-integer time advancement without mutating state", () => {
    const state = createInitialState({ seed: "fractional-time" });
    const result = applyCommand(state, { type: "ADVANCE_TIME", minutes: 1.5 });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);

    if (!result.ok) {
      expect(result.failure.code).toBe("INVALID_ADVANCE_TIME_MINUTES");
    }
  });

  it("rejects unbounded time advancement without mutating state", () => {
    const state = createInitialState({ seed: "unbounded-time" });
    const result = applyCommand(state, {
      type: "ADVANCE_TIME",
      minutes: MAX_TIME_ADVANCE_MINUTES + 1
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);

    if (!result.ok) {
      expect(result.failure.code).toBe("TIME_ADVANCE_EXCEEDS_LIMIT");
    }
  });

  it("replays repeated time command sequences deterministically", () => {
    const commands: readonly GameCommand[] = [
      { type: "ADVANCE_TIME", minutes: 30 },
      { type: "ADVANCE_TIME", minutes: MINUTES_PER_DAY },
      { type: "SLEEP_TO_NEXT_DAY" },
      { type: "advanceTime", minutes: 5 }
    ];

    const first = replayCommands({ seed: "time-replay", commands });
    const second = replayCommands({ seed: "time-replay", commands });

    expect(JSON.stringify(first.finalState)).toBe(JSON.stringify(second.finalState));
    expect(JSON.stringify(first.events)).toBe(JSON.stringify(second.events));
    expect(JSON.stringify(first.audit)).toBe(JSON.stringify(second.audit));
  });

  it("sleeps to the next day start and restores daily energy", () => {
    const initialState = createInitialState({ seed: "sleep" });
    const state = {
      ...initialState,
      player: {
        ...initialState.player,
        energy: 12
      }
    };
    const result = applyCommand(state, { type: "SLEEP_TO_NEXT_DAY" });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.state.time).toEqual({
        day: 2,
        minuteOfDay: DEFAULT_START_MINUTE,
        elapsedMinutes: MINUTES_PER_DAY + DEFAULT_START_MINUTE
      });
      expect(result.state.player.energy).toBe(DEFAULT_MAX_ENERGY);
      expect(result.events.map((event) => event.type)).toEqual(["DAY_STARTED", "TIME_ADVANCED"]);
    }
  });
});
