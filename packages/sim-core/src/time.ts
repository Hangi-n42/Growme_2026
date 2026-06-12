import {
  DEFAULT_START_MINUTE,
  MAX_TIME_ADVANCE_MINUTES,
  MINUTES_PER_DAY,
  TIME_PHASES,
  type GameTimePhase,
  type GameTime
} from "./types";

export interface TimeAdvanceValidationFailure {
  readonly code: "INVALID_ADVANCE_TIME_MINUTES" | "TIME_ADVANCE_EXCEEDS_LIMIT";
  readonly message: string;
}

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

  const elapsedMinutes = (day - 1) * MINUTES_PER_DAY + minuteOfDay;

  if (!Number.isSafeInteger(elapsedMinutes)) {
    throw new Error("Game time elapsed minutes must be a safe integer.");
  }

  return {
    day,
    minuteOfDay,
    elapsedMinutes
  };
}

export function advanceGameTime(time: GameTime, minutes: number): GameTime {
  const validationFailure = validateTimeAdvanceMinutes(minutes);

  if (validationFailure !== undefined) {
    throw new Error(validationFailure.message);
  }

  const elapsedMinutes = time.elapsedMinutes + minutes;

  if (!Number.isSafeInteger(elapsedMinutes)) {
    throw new Error("Game time advancement would exceed safe integer bounds.");
  }

  return {
    day: Math.floor(elapsedMinutes / MINUTES_PER_DAY) + 1,
    minuteOfDay: elapsedMinutes % MINUTES_PER_DAY,
    elapsedMinutes
  };
}

export function isPositiveIntegerMinute(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function validateTimeAdvanceMinutes(
  value: unknown
): TimeAdvanceValidationFailure | undefined {
  if (!isPositiveIntegerMinute(value) || !Number.isSafeInteger(value)) {
    return {
      code: "INVALID_ADVANCE_TIME_MINUTES",
      message: "ADVANCE_TIME requires a positive safe integer minute count."
    };
  }

  if (value > MAX_TIME_ADVANCE_MINUTES) {
    return {
      code: "TIME_ADVANCE_EXCEEDS_LIMIT",
      message: `Time advancement cannot exceed ${MAX_TIME_ADVANCE_MINUTES} minutes.`
    };
  }

  return undefined;
}

export function isSafeTimeAdvanceMinutes(value: unknown): value is number {
  return validateTimeAdvanceMinutes(value) === undefined;
}

export function getNextDayStartTime(
  time: GameTime,
  dayStartMinute = DEFAULT_START_MINUTE
): GameTime {
  return createGameTime(time.day + 1, dayStartMinute);
}

export function getMinutesUntilNextDayStart(
  time: GameTime,
  dayStartMinute = DEFAULT_START_MINUTE
): number {
  return getNextDayStartTime(time, dayStartMinute).elapsedMinutes - time.elapsedMinutes;
}

export function getCrossedDayNumbers(
  startTime: GameTime,
  endTime: GameTime
): readonly number[] {
  if (endTime.day <= startTime.day) {
    return [];
  }

  const crossedDays: number[] = [];

  for (let day = startTime.day + 1; day <= endTime.day; day += 1) {
    crossedDays.push(day);
  }

  return crossedDays;
}

export function didTimeRangeCrossDay(startTime: GameTime, endTime: GameTime): boolean {
  return endTime.day > startTime.day;
}

export function getTimePhase(time: GameTime): GameTimePhase {
  const minute = time.minuteOfDay;

  if (minute >= 360 && minute < 720) {
    return TIME_PHASES.MORNING;
  }

  if (minute >= 720 && minute < 1080) {
    return TIME_PHASES.AFTERNOON;
  }

  if (minute >= 1080 && minute < 1320) {
    return TIME_PHASES.EVENING;
  }

  return TIME_PHASES.NIGHT;
}
