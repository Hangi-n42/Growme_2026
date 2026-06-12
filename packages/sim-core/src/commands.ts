import {
  advanceGameTime,
  createGameTime,
  getCrossedDayNumbers,
  getMinutesUntilNextDayStart,
  validateTimeAdvanceMinutes
} from "./time";
import type {
  AuditEvent,
  AuditEventType,
  CommandFailure,
  CommandFailureCode,
  GameCommand,
  GameCommandResult,
  GameCommandType,
  GameEvent,
  GameEventCategory,
  GameState,
  GameTime,
  JsonObject
} from "./types";
import { DEFAULT_MAX_ENERGY, GAME_EVENT_TYPES, MINUTES_PER_DAY } from "./types";

type CommandRecord = {
  readonly type: string;
  readonly [key: string]: unknown;
};

export function applyCommand(state: GameState, command: unknown): GameCommandResult {
  return reduceGameCommand(state, command);
}

export function reduceGameCommand(state: GameState, command: unknown): GameCommandResult {
  if (!isCommandRecord(command)) {
    return failCommand(state, command, {
      code: "INVALID_COMMAND_SHAPE",
      commandType: "UNKNOWN",
      message: "Command must be an object with a string type.",
      payload: {}
    });
  }

  const commandType = canonicalCommandType(command.type);

  if (commandType === undefined) {
    return failCommand(state, command, {
      code: "UNKNOWN_COMMAND",
      commandType: "UNKNOWN",
      message: `Unknown command type: ${command.type}`,
      payload: { receivedType: command.type }
    });
  }

  switch (commandType) {
    case "NOOP":
      return applyNoop(state, command);
    case "ADVANCE_TIME":
      return advanceTime(state, command);
    case "SLEEP_TO_NEXT_DAY":
      return sleepToNextDay(state, command);
  }
}

function applyNoop(state: GameState, command: CommandRecord): GameCommandResult {
  return succeedCommand(state, command as GameCommand, "NOOP", [
    createGameEvent(
      state,
      state.time,
      "NOOP",
      GAME_EVENT_TYPES.COMMAND_NOOP,
      "command",
      "No operation command applied.",
      {},
      0
    )
  ]);
}

function advanceTime(state: GameState, command: CommandRecord): GameCommandResult {
  const validationFailure = validateTimeAdvanceMinutes(command.minutes);

  if (validationFailure !== undefined) {
    return failCommand(state, command, {
      code: validationFailure.code,
      commandType: "ADVANCE_TIME",
      message: validationFailure.message,
      payload: {}
    });
  }

  const minutes = command.minutes as number;

  if (!Number.isSafeInteger(state.time.elapsedMinutes + minutes)) {
    return failCommand(state, command, {
      code: "TIME_ADVANCE_OVERFLOW",
      commandType: "ADVANCE_TIME",
      message: "ADVANCE_TIME would exceed safe elapsed minute bounds.",
      payload: {}
    });
  }

  const time = advanceGameTime(state.time, minutes);
  const timedState = withGameTime(state, time);
  const events = createTimeAdvanceEvents(
    state,
    state.time,
    time,
    "ADVANCE_TIME",
    minutes,
    "advanceTime"
  );

  return succeedCommand(timedState, command as GameCommand, "ADVANCE_TIME", events);
}

function sleepToNextDay(state: GameState, command: CommandRecord): GameCommandResult {
  const minutes = getMinutesUntilNextDayStart(state.time);
  const time = advanceGameTime(state.time, minutes);
  const sleptState = withGameTime(
    {
      ...state,
      player: {
        ...state.player,
        energy: DEFAULT_MAX_ENERGY
      }
    },
    time
  );
  const events = createTimeAdvanceEvents(
    state,
    state.time,
    time,
    "SLEEP_TO_NEXT_DAY",
    minutes,
    "sleepToNextDay"
  );

  return succeedCommand(sleptState, command as GameCommand, "SLEEP_TO_NEXT_DAY", events);
}

function succeedCommand(
  state: GameState,
  command: GameCommand,
  commandType: GameCommandType,
  events: readonly GameEvent[]
): GameCommandResult {
  const audit = createAuditEvent(
    state,
    state.time,
    "command.applied",
    commandType,
    "Command applied.",
    {
      commandSequence: state.commandLog.nextSequence,
      eventCount: events.length
    }
  );

  return {
    ok: true,
    status: "success",
    command,
    state: {
      ...state,
      eventLog: [...state.eventLog, ...events],
      auditLog: [...state.auditLog, audit],
      commandLog: {
        nextSequence: state.commandLog.nextSequence + 1,
        appliedCount: state.commandLog.appliedCount + 1
      }
    },
    events,
    audit: [audit]
  };
}

function failCommand(
  state: GameState,
  command: unknown,
  failure: CommandFailure
): GameCommandResult {
  const event = createGameEvent(
    state,
    state.time,
    failure.commandType,
    GAME_EVENT_TYPES.COMMAND_FAILED,
    "command",
    failure.message,
    {
      code: failure.code,
      commandSequence: state.commandLog.nextSequence
    },
    0
  );
  const audit = createAuditEvent(
    state,
    state.time,
    "command.rejected",
    failure.commandType,
    failure.message,
    {
      code: failure.code,
      commandSequence: state.commandLog.nextSequence
    }
  );

  return {
    ok: false,
    status: "failure",
    command,
    state,
    events: [event],
    audit: [audit],
    failure,
    error: failure.message
  };
}

function withGameTime(state: GameState, time: GameTime): GameState {
  return {
    ...state,
    time,
    day: time.day,
    minute: time.minuteOfDay
  };
}

function createGameEvent(
  state: GameState,
  time: GameTime,
  commandType: GameCommandType | "UNKNOWN",
  type: string,
  category: GameEventCategory,
  message: string,
  payload: JsonObject,
  sequenceOffset: number
): GameEvent {
  const sequence = state.eventLog.length + sequenceOffset;

  return {
    id: `evt-${sequence.toString().padStart(6, "0")}`,
    sequence,
    kind: "game",
    type,
    category,
    commandType,
    message,
    time,
    payload
  };
}

function createTimeAdvanceEvents(
  state: GameState,
  startTime: GameTime,
  endTime: GameTime,
  commandType: GameCommandType,
  minutes: number,
  reason: string
): readonly GameEvent[] {
  const crossedDays = getCrossedDayNumbers(startTime, endTime);
  const events: GameEvent[] = [];

  for (const day of crossedDays) {
    events.push(
      createGameEvent(
        state,
        createGameTime(day, 0),
        commandType,
        GAME_EVENT_TYPES.DAY_STARTED,
        "time",
        "New simulation day started.",
        {
          day,
          previousDay: day - 1,
          totalElapsedMinutes: (day - 1) * MINUTES_PER_DAY,
          reason
        },
        events.length
      )
    );
  }

  events.push(
    createGameEvent(
      state,
      endTime,
      commandType,
      GAME_EVENT_TYPES.TIME_ADVANCED,
      "time",
      "Simulation time advanced.",
      {
        minutes,
        fromDay: startTime.day,
        fromMinuteOfDay: startTime.minuteOfDay,
        fromElapsedMinutes: startTime.elapsedMinutes,
        toDay: endTime.day,
        toMinuteOfDay: endTime.minuteOfDay,
        toElapsedMinutes: endTime.elapsedMinutes,
        crossedDayCount: crossedDays.length,
        crossedDays,
        reason
      },
      events.length
    )
  );

  return events;
}

function createAuditEvent(
  state: GameState,
  time: GameTime,
  type: AuditEventType,
  commandType: GameCommandType | "UNKNOWN",
  message: string,
  payload: JsonObject
): AuditEvent {
  const sequence = state.auditLog.length;

  return {
    id: `audit-${sequence.toString().padStart(6, "0")}`,
    sequence,
    kind: "audit",
    type,
    commandType,
    message,
    time,
    payload
  };
}

function canonicalCommandType(type: string): GameCommandType | undefined {
  if (type === "NOOP") {
    return "NOOP";
  }

  if (type === "ADVANCE_TIME" || type === "advanceTime") {
    return "ADVANCE_TIME";
  }

  if (type === "SLEEP_TO_NEXT_DAY" || type === "sleepToNextDay") {
    return "SLEEP_TO_NEXT_DAY";
  }

  return undefined;
}

function isCommandRecord(command: unknown): command is CommandRecord {
  return (
    typeof command === "object" &&
    command !== null &&
    "type" in command &&
    typeof command.type === "string"
  );
}
