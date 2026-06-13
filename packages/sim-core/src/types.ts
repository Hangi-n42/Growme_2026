export const GAME_STATE_VERSION = 1;
export const SAVE_SCHEMA_VERSION = 1;
export const DEFAULT_CONTENT_VERSION = "v0.1-foundation";
export const MINUTES_PER_DAY = 1440;
export const DEFAULT_START_MINUTE = 6 * 60;
export const MAX_TIME_ADVANCE_MINUTES = MINUTES_PER_DAY * 30;
export const DEFAULT_MAX_ENERGY = 100;

export const TIME_PHASES = {
  NIGHT: "NIGHT",
  MORNING: "MORNING",
  AFTERNOON: "AFTERNOON",
  EVENING: "EVENING"
} as const;

export const GAME_EVENT_TYPES = {
  COMMAND_NOOP: "COMMAND_NOOP",
  COMMAND_FAILED: "COMMAND_FAILED",
  TIME_ADVANCED: "TIME_ADVANCED",
  DAY_STARTED: "DAY_STARTED",
  FARM_TILE_TILLED: "FARM_TILE_TILLED",
  FARM_CROP_PLANTED: "FARM_CROP_PLANTED",
  FARM_CROP_WATERED: "FARM_CROP_WATERED",
  FARM_CROP_GROWTH_ADVANCED: "FARM_CROP_GROWTH_ADVANCED",
  FARM_CROP_READY: "FARM_CROP_READY",
  FARM_CROP_HARVESTED: "FARM_CROP_HARVESTED",
  FARM_TILE_CLEARED: "FARM_TILE_CLEARED"
} as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type ItemId = string;
export type NpcId = string;
export type CropId = string;
export type GameEventId = string;
export type AuditEventId = string;
export type GameTimePhase = (typeof TIME_PHASES)[keyof typeof TIME_PHASES];
export type GameEventType = (typeof GAME_EVENT_TYPES)[keyof typeof GAME_EVENT_TYPES] | string;

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

export const FARM_TILE_STATES = {
  UNTILLED: "untilled",
  TILLED: "tilled",
  PLANTED: "planted",
  WATERED: "watered",
  READY: "ready",
  BLOCKED: "blocked"
} as const;

export type FarmTileState = (typeof FARM_TILE_STATES)[keyof typeof FARM_TILE_STATES];
export type PostHarvestTileState = typeof FARM_TILE_STATES.UNTILLED | typeof FARM_TILE_STATES.TILLED;

export interface FarmTile {
  readonly x: number;
  readonly y: number;
  readonly state: FarmTileState;
  readonly cropId?: CropId;
  readonly seedItemId?: ItemId;
  readonly harvestItemId?: ItemId;
  readonly plantedDay?: number;
  readonly wateredOnDay?: number;
  readonly growthDaysWatered?: number;
  readonly readyDay?: number;
}

export interface CropDefinition {
  readonly id: CropId;
  readonly seedItemId: ItemId;
  readonly harvestItemId: ItemId;
  readonly growthDays: number;
  readonly harvestQuantity: number;
  readonly requiresWater: boolean;
  readonly postHarvestTileState: PostHarvestTileState;
}

export interface FarmState {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly FarmTile[];
  readonly cropDefinitions: readonly CropDefinition[];
}

export interface MineDailyState {
  readonly day: number;
  readonly floor: number;
  readonly depletedNodeIds: readonly string[];
  readonly exitRevealed: boolean;
}

export interface MineState {
  readonly deepestFloorReached: number;
  readonly daily: MineDailyState;
}

export interface ShopRuntimeState {
  readonly shopId: string;
  readonly stock: Inventory;
  readonly budget: number;
  readonly nextRestockDay: number;
}

export interface ShopsState {
  readonly shops: readonly ShopRuntimeState[];
}

export type ContractRuntimeStatus = "active" | "completed" | "expired";

export interface ContractRuntimeState {
  readonly contractId: string;
  readonly requesterId: NpcId;
  readonly status: ContractRuntimeStatus;
  readonly acceptedDay: number;
  readonly deadlineDay: number;
  readonly progress: number;
}

export interface ContractCooldownState {
  readonly contractId: string;
  readonly availableDay: number;
}

export interface ContractsState {
  readonly active: readonly ContractRuntimeState[];
  readonly completedIds: readonly string[];
  readonly cooldowns: readonly ContractCooldownState[];
}

export interface NpcMemoryState {
  readonly metNpcIds: readonly NpcId[];
  readonly memoryFlags: readonly string[];
}

export interface RelationshipAffinityState {
  readonly npcId: NpcId;
  readonly affinity: number;
}

export interface RelationshipDailyGainState {
  readonly npcId: NpcId;
  readonly day: number;
  readonly amount: number;
}

export interface RelationshipsState {
  readonly affinity: readonly RelationshipAffinityState[];
  readonly dailyGains: readonly RelationshipDailyGainState[];
  readonly milestoneFlags: readonly string[];
}

export interface StoryState {
  readonly completedEventIds: readonly string[];
  readonly flags: readonly string[];
}

export interface DecorPlacementState {
  readonly placementId: string;
  readonly itemId: ItemId;
  readonly areaId: string;
  readonly x: number;
  readonly y: number;
  readonly rotation: 0 | 90 | 180 | 270;
}

export interface DecorState {
  readonly placements: readonly DecorPlacementState[];
}

export type GameEventCategory = "command" | "system" | "time" | "farm";

export interface GameEvent {
  readonly id: GameEventId;
  readonly sequence: number;
  readonly kind: "game";
  readonly type: GameEventType;
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
  readonly farm: FarmState;
  readonly mine: MineState;
  readonly shops: ShopsState;
  readonly contracts: ContractsState;
  readonly npcs: NpcMemoryState;
  readonly relationships: RelationshipsState;
  readonly story: StoryState;
  readonly decor: DecorState;
  readonly flags: readonly string[];
  readonly eventLog: readonly GameEvent[];
  readonly auditLog: readonly AuditEvent[];
  readonly commandLog: CommandLogState;
}

export interface GameSaveSnapshot {
  readonly schemaVersion: typeof SAVE_SCHEMA_VERSION;
  readonly stateVersion: typeof GAME_STATE_VERSION;
  readonly contentVersion: string;
  readonly commandLogPointer: number;
  readonly state: GameState;
}

export type GameCommandType =
  | "NOOP"
  | "ADVANCE_TIME"
  | "SLEEP_TO_NEXT_DAY"
  | "TILL_TILE"
  | "PLANT_CROP"
  | "WATER_CROP"
  | "HARVEST_CROP"
  | "CLEAR_TILE";

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

export interface SleepToNextDayCommand {
  readonly type: "SLEEP_TO_NEXT_DAY";
}

export interface LegacySleepToNextDayCommand {
  readonly type: "sleepToNextDay";
}

export interface TillTileCommand {
  readonly type: "TILL_TILE";
  readonly x: number;
  readonly y: number;
}

export interface LegacyTillTileCommand {
  readonly type: "tillTile";
  readonly x: number;
  readonly y: number;
}

export interface PlantCropCommand {
  readonly type: "PLANT_CROP";
  readonly x: number;
  readonly y: number;
  readonly seedItemId: ItemId;
}

export interface LegacyPlantCropCommand {
  readonly type: "plantCrop";
  readonly x: number;
  readonly y: number;
  readonly seedItemId: ItemId;
}

export interface WaterCropCommand {
  readonly type: "WATER_CROP";
  readonly x: number;
  readonly y: number;
}

export interface LegacyWaterCropCommand {
  readonly type: "waterCrop";
  readonly x: number;
  readonly y: number;
}

export interface HarvestCropCommand {
  readonly type: "HARVEST_CROP";
  readonly x: number;
  readonly y: number;
}

export interface LegacyHarvestCropCommand {
  readonly type: "harvestCrop";
  readonly x: number;
  readonly y: number;
}

export interface ClearTileCommand {
  readonly type: "CLEAR_TILE";
  readonly x: number;
  readonly y: number;
}

export interface LegacyClearTileCommand {
  readonly type: "clearTile";
  readonly x: number;
  readonly y: number;
}

export type GameCommand =
  | NoopCommand
  | AdvanceTimeCommand
  | LegacyAdvanceTimeCommand
  | SleepToNextDayCommand
  | LegacySleepToNextDayCommand
  | TillTileCommand
  | LegacyTillTileCommand
  | PlantCropCommand
  | LegacyPlantCropCommand
  | WaterCropCommand
  | LegacyWaterCropCommand
  | HarvestCropCommand
  | LegacyHarvestCropCommand
  | ClearTileCommand
  | LegacyClearTileCommand;

export type CommandFailureCode =
  | "UNKNOWN_COMMAND"
  | "INVALID_COMMAND_SHAPE"
  | "INVALID_ADVANCE_TIME_MINUTES"
  | "TIME_ADVANCE_EXCEEDS_LIMIT"
  | "TIME_ADVANCE_OVERFLOW"
  | "INVALID_TILE_COORDINATES"
  | "FARM_TILE_BLOCKED"
  | "FARM_TILE_NOT_TILLABLE"
  | "FARM_TILE_NOT_PLANTABLE"
  | "FARM_TILE_NOT_WATERABLE"
  | "FARM_TILE_NOT_CLEARABLE"
  | "UNKNOWN_CROP_SEED"
  | "UNKNOWN_CROP"
  | "INVALID_SEED_ITEM"
  | "INSUFFICIENT_ENERGY"
  | "INVENTORY_TRANSACTION_FAILED"
  | "CROP_NOT_READY";

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
