import { advanceGameTime, isPositiveIntegerMinute } from "./time";
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
  }
}

function applyNoop(state: GameState, command: CommandRecord): GameCommandResult {
  return succeedCommand(state, command as GameCommand, "NOOP", [
    createGameEvent(
      state,
      state.time,
      "NOOP",
      "command.noop",
      "command",
      "No operation command applied.",
      {}
    )
  ]);
}

function advanceTime(state: GameState, command: CommandRecord): GameCommandResult {
  if (!isPositiveIntegerMinute(command.minutes)) {
    return failCommand(state, command, {
      code: "INVALID_ADVANCE_TIME_MINUTES",
      commandType: "ADVANCE_TIME",
      message: "ADVANCE_TIME requires a positive integer minute count.",
      payload: {}
    });
  }

  const time = advanceGameTime(state.time, command.minutes);
  const timedState = withGameTime(state, time);

  return succeedCommand(timedState, command as GameCommand, "ADVANCE_TIME", [
    createGameEvent(
      state,
      time,
      "ADVANCE_TIME",
      "time.advanced",
      "time",
      "Simulation time advanced.",
      { minutes: command.minutes }
    )
  ]);
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
    "command.failed",
    "command",
    failure.message,
    {
      code: failure.code,
      commandSequence: state.commandLog.nextSequence
    }
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
  payload: JsonObject
): GameEvent {
  const sequence = state.eventLog.length;

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
