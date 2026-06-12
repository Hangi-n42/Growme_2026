import {
  DEFAULT_START_MINUTE,
  MINUTES_PER_DAY,
  type GameTime
} from "./types";

export function createGameTime(
  day = 1,
  minuteOfDay = DEFAULT_START_MINUTE
): GameTime {
  if (!Number.isInteger(day) || day < 1) {
    throw new Error("Game time day must be a positive integer.");
  }

  if (!Number.isInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay >= MINUTES_PER_DAY) {
    throw new Error("Game time minute must be an integer within the day.");
  }

  return {
    day,
    minuteOfDay,
    elapsedMinutes: (day - 1) * MINUTES_PER_DAY + minuteOfDay
  };
}

export function advanceGameTime(time: GameTime, minutes: number): GameTime {
  const elapsedMinutes = time.elapsedMinutes + minutes;

  return {
    day: Math.floor(elapsedMinutes / MINUTES_PER_DAY) + 1,
    minuteOfDay: elapsedMinutes % MINUTES_PER_DAY,
    elapsedMinutes
  };
}

export function isPositiveIntegerMinute(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
