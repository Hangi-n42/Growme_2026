export const GAME_STATE_VERSION = 1;
export const DEFAULT_CONTENT_VERSION = "v0.1-foundation";
export const MINUTES_PER_DAY = 1440;
export const DEFAULT_START_MINUTE = 6 * 60;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type ItemId = string;
export type NpcId = string;
export type GameEventId = string;
export type AuditEventId = string;

export interface Inventory {
  readonly [itemId: ItemId]: number;
}

export interface GameTime {
  readonly day: number;
  readonly minuteOfDay: number;
  readonly elapsedMinutes: number;
}

export interface SeedState {
  readonly seed: string;
  readonly value: number;
  readonly rolls: number;
}

export interface PlayerState {
  readonly energy: number;
  readonly wallet: number;
  readonly inventory: Inventory;
}

export type GameEventCategory = "command" | "system" | "time";

export interface GameEvent {
  readonly id: GameEventId;
  readonly sequence: number;
  readonly kind: "game";
  readonly type: string;
  readonly category: GameEventCategory;
  readonly commandType: GameCommandType | "UNKNOWN";
  readonly message: string;
  readonly time: GameTime;
  readonly payload: JsonObject;
}

export type AuditEventType = "command.applied" | "command.rejected";

export interface AuditEvent {
  readonly id: AuditEventId;
  readonly sequence: number;
  readonly kind: "audit";
  readonly type: AuditEventType;
  readonly commandType: GameCommandType | "UNKNOWN";
  readonly message: string;
  readonly time: GameTime;
  readonly payload: JsonObject;
}

export interface CommandLogState {
  readonly nextSequence: number;
  readonly appliedCount: number;
}

export interface GameState {
  readonly version: typeof GAME_STATE_VERSION;
  readonly contentVersion: string;
  readonly seed: string;
  readonly rng: SeedState;
  readonly time: GameTime;
  readonly day: number;
  readonly minute: number;
  readonly player: PlayerState;
  readonly flags: readonly string[];
  readonly eventLog: readonly GameEvent[];
  readonly auditLog: readonly AuditEvent[];
  readonly commandLog: CommandLogState;
}

export type GameCommandType = "NOOP" | "ADVANCE_TIME";

export interface NoopCommand {
  readonly type: "NOOP";
}

export interface AdvanceTimeCommand {
  readonly type: "ADVANCE_TIME";
  readonly minutes: number;
}

export interface LegacyAdvanceTimeCommand {
  readonly type: "advanceTime";
  readonly minutes: number;
}

export type GameCommand = NoopCommand | AdvanceTimeCommand | LegacyAdvanceTimeCommand;

export type CommandFailureCode =
  | "UNKNOWN_COMMAND"
  | "INVALID_COMMAND_SHAPE"
  | "INVALID_ADVANCE_TIME_MINUTES";

export interface CommandFailure {
  readonly code: CommandFailureCode;
  readonly commandType: GameCommandType | "UNKNOWN";
  readonly message: string;
  readonly payload: JsonObject;
}

export interface CommandSuccessResult {
  readonly ok: true;
  readonly status: "success";
  readonly command: GameCommand;
  readonly state: GameState;
  readonly events: readonly GameEvent[];
  readonly audit: readonly AuditEvent[];
}

export interface CommandFailureResult {
  readonly ok: false;
  readonly status: "failure";
  readonly command: unknown;
  readonly state: GameState;
  readonly events: readonly GameEvent[];
  readonly audit: readonly AuditEvent[];
  readonly failure: CommandFailure;
  readonly error: string;
}

export type GameCommandResult = CommandSuccessResult | CommandFailureResult;

export type SimState = GameState;
export type SimPlayerState = PlayerState;
export type SimEvent = GameEvent;
export type SimCommand = GameCommand;
export type SimResult = GameCommandResult;
