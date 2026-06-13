import {
  createInitialContractsState,
  createInitialDecorState,
  createInitialMineState,
  createInitialNpcMemoryState,
  createInitialRelationshipsState,
  createInitialShopsState,
  createInitialStoryState
} from "./state";
import {
  FARM_TILE_STATES,
  GAME_STATE_VERSION,
  SAVE_SCHEMA_VERSION,
  type AuditEvent,
  type CommandLogState,
  type FarmState,
  type GameEvent,
  type GameSaveSnapshot,
  type GameState,
  type GameTime,
  type PlayerState,
  type SeedState
} from "./types";

export interface SaveValidationIssue {
  readonly path: string;
  readonly message: string;
}

export type SaveValidationResult =
  | {
      readonly ok: true;
      readonly snapshot: GameSaveSnapshot;
    }
  | {
      readonly ok: false;
      readonly issues: readonly SaveValidationIssue[];
    };

export type SaveMigrationResult =
  | {
      readonly ok: true;
      readonly snapshot: GameSaveSnapshot;
      readonly migrated: boolean;
      readonly fromSchemaVersion: number | "legacy-unversioned";
      readonly toSchemaVersion: typeof SAVE_SCHEMA_VERSION;
    }
  | {
      readonly ok: false;
      readonly issues: readonly SaveValidationIssue[];
    };

export type SaveLoadResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly snapshot: GameSaveSnapshot;
      readonly migrated: boolean;
    }
  | {
      readonly ok: false;
      readonly error: string;
      readonly issues: readonly SaveValidationIssue[];
    };

export interface DeserializeStateOptions {
  readonly expectedContentVersion?: string;
}

export class SaveValidationError extends Error {
  readonly issues: readonly SaveValidationIssue[];

  constructor(message: string, issues: readonly SaveValidationIssue[]) {
    super(message);
    this.name = "SaveValidationError";
    this.issues = issues;
  }
}

export function createSaveSnapshot(state: GameState): GameSaveSnapshot {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    stateVersion: state.version,
    contentVersion: state.contentVersion,
    commandLogPointer: state.commandLog.nextSequence,
    state
  };
}

export function serializeState(state: GameState): string {
  return JSON.stringify(createSaveSnapshot(state));
}

export function deserializeState(
  serialized: string,
  options: DeserializeStateOptions = {}
): GameState {
  const result = tryDeserializeState(serialized, options);

  if (!result.ok) {
    throw new SaveValidationError(result.error, result.issues);
  }

  return result.state;
}

export function tryDeserializeState(
  serialized: string,
  options: DeserializeStateOptions = {}
): SaveLoadResult {
  const parsed = parseSerializedSave(serialized);

  if (!parsed.ok) {
    return {
      ok: false,
      error: "Save data is not valid JSON.",
      issues: parsed.issues
    };
  }

  const migration = migrateSaveSnapshot(parsed.value);

  if (!migration.ok) {
    return {
      ok: false,
      error: "Save data is not a supported snapshot.",
      issues: migration.issues
    };
  }

  const validation = validateSaveSnapshot(migration.snapshot, options);

  if (!validation.ok) {
    return {
      ok: false,
      error: "Save data failed validation.",
      issues: validation.issues
    };
  }

  return {
    ok: true,
    state: validation.snapshot.state,
    snapshot: validation.snapshot,
    migrated: migration.migrated
  };
}

export function migrateSaveSnapshot(value: unknown): SaveMigrationResult {
  if (isRecord(value) && "schemaVersion" in value) {
    return {
      ok: true,
      snapshot: value as unknown as GameSaveSnapshot,
      migrated: false,
      fromSchemaVersion:
        typeof value.schemaVersion === "number" ? value.schemaVersion : "legacy-unversioned",
      toSchemaVersion: SAVE_SCHEMA_VERSION
    };
  }

  if (isLegacyGameStateSnapshot(value)) {
    return {
      ok: true,
      snapshot: createSaveSnapshot(normalizeLegacyGameState(value)),
      migrated: true,
      fromSchemaVersion: "legacy-unversioned",
      toSchemaVersion: SAVE_SCHEMA_VERSION
    };
  }

  return {
    ok: false,
    issues: [
      {
        path: "save",
        message: "Save data must be a v1 snapshot envelope or legacy GameState snapshot."
      }
    ]
  };
}

export function validateSaveSnapshot(
  value: unknown,
  options: DeserializeStateOptions = {}
): SaveValidationResult {
  const issues: SaveValidationIssue[] = [];
  const snapshot = readRecord(value, "save", issues);

  if (snapshot === undefined) {
    return { ok: false, issues };
  }

  requireExactNumber(snapshot.schemaVersion, SAVE_SCHEMA_VERSION, "save.schemaVersion", issues);
  requireExactNumber(snapshot.stateVersion, GAME_STATE_VERSION, "save.stateVersion", issues);
  requireNonEmptyString(snapshot.contentVersion, "save.contentVersion", issues);
  requireNonNegativeInteger(snapshot.commandLogPointer, "save.commandLogPointer", issues);

  if (
    options.expectedContentVersion !== undefined &&
    snapshot.contentVersion !== options.expectedContentVersion
  ) {
    issues.push({
      path: "save.contentVersion",
      message: `Expected content version ${options.expectedContentVersion}.`
    });
  }

  const state = readRecord(snapshot.state, "save.state", issues);
  if (state !== undefined) {
    collectGameStateIssues(state, "save.state", false, issues);

    const stateContentVersion = state.contentVersion;
    if (typeof stateContentVersion === "string" && snapshot.contentVersion !== stateContentVersion) {
      issues.push({
        path: "save.contentVersion",
        message: "Snapshot contentVersion must match state.contentVersion."
      });
    }

    const commandLog = isRecord(state.commandLog) ? state.commandLog : undefined;
    const nextSequence = commandLog?.nextSequence;
    if (
      Number.isSafeInteger(snapshot.commandLogPointer) &&
      Number.isSafeInteger(nextSequence) &&
      snapshot.commandLogPointer !== nextSequence
    ) {
      issues.push({
        path: "save.commandLogPointer",
        message: "Snapshot commandLogPointer must match state.commandLog.nextSequence."
      });
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    snapshot: value as GameSaveSnapshot
  };
}

function parseSerializedSave(
  serialized: string
):
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly issues: readonly SaveValidationIssue[] } {
  try {
    return {
      ok: true,
      value: JSON.parse(serialized) as unknown
    };
  } catch {
    return {
      ok: false,
      issues: [
        {
          path: "save",
          message: "Serialized save must be valid JSON."
        }
      ]
    };
  }
}

function isLegacyGameStateSnapshot(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }

  const issues: SaveValidationIssue[] = [];
  collectGameStateIssues(value, "legacyState", true, issues);

  return issues.length === 0;
}

function normalizeLegacyGameState(value: Record<string, unknown>): GameState {
  const state = value as Partial<GameState>;
  const time = state.time as GameTime;

  return {
    version: GAME_STATE_VERSION,
    contentVersion: state.contentVersion as string,
    seed: state.seed as string,
    rng: state.rng as SeedState,
    time,
    day: state.day as number,
    minute: state.minute as number,
    player: state.player as PlayerState,
    farm: state.farm as FarmState,
    mine: state.mine ?? createInitialMineState(time.day),
    shops: state.shops ?? createInitialShopsState(),
    contracts: state.contracts ?? createInitialContractsState(),
    npcs: state.npcs ?? createInitialNpcMemoryState(),
    relationships: state.relationships ?? createInitialRelationshipsState(),
    story: state.story ?? createInitialStoryState(),
    decor: state.decor ?? createInitialDecorState(),
    flags: state.flags as readonly string[],
    eventLog: state.eventLog as readonly GameEvent[],
    auditLog: state.auditLog as readonly AuditEvent[],
    commandLog: state.commandLog as CommandLogState
  };
}

function collectGameStateIssues(
  value: Record<string, unknown>,
  path: string,
  allowMissingRuntimeSlices: boolean,
  issues: SaveValidationIssue[]
): void {
  requireExactNumber(value.version, GAME_STATE_VERSION, `${path}.version`, issues);
  requireNonEmptyString(value.contentVersion, `${path}.contentVersion`, issues);
  requireNonEmptyString(value.seed, `${path}.seed`, issues);
  validateSeedState(value.rng, `${path}.rng`, issues);
  validateGameTime(value.time, `${path}.time`, issues);
  requireNonNegativeInteger(value.day, `${path}.day`, issues);
  requireNonNegativeInteger(value.minute, `${path}.minute`, issues);

  const time = isRecord(value.time) ? value.time : undefined;
  if (
    time !== undefined &&
    Number.isSafeInteger(time.day) &&
    Number.isSafeInteger(value.day) &&
    value.day !== time.day
  ) {
    issues.push({
      path: `${path}.day`,
      message: "State day must match time.day."
    });
  }

  if (
    time !== undefined &&
    Number.isSafeInteger(time.minuteOfDay) &&
    Number.isSafeInteger(value.minute) &&
    value.minute !== time.minuteOfDay
  ) {
    issues.push({
      path: `${path}.minute`,
      message: "State minute must match time.minuteOfDay."
    });
  }

  validatePlayerState(value.player, `${path}.player`, issues);
  validateFarmState(value.farm, `${path}.farm`, issues);
  validateRuntimeSlice(value.mine, `${path}.mine`, allowMissingRuntimeSlices, validateMineState, issues);
  validateRuntimeSlice(value.shops, `${path}.shops`, allowMissingRuntimeSlices, validateShopsState, issues);
  validateRuntimeSlice(
    value.contracts,
    `${path}.contracts`,
    allowMissingRuntimeSlices,
    validateContractsState,
    issues
  );
  validateRuntimeSlice(value.npcs, `${path}.npcs`, allowMissingRuntimeSlices, validateNpcMemoryState, issues);
  validateRuntimeSlice(
    value.relationships,
    `${path}.relationships`,
    allowMissingRuntimeSlices,
    validateRelationshipsState,
    issues
  );
  validateRuntimeSlice(value.story, `${path}.story`, allowMissingRuntimeSlices, validateStoryState, issues);
  validateRuntimeSlice(value.decor, `${path}.decor`, allowMissingRuntimeSlices, validateDecorState, issues);
  validateStringArray(value.flags, `${path}.flags`, issues);
  validateObjectArray(value.eventLog, `${path}.eventLog`, issues);
  validateObjectArray(value.auditLog, `${path}.auditLog`, issues);
  validateCommandLogState(value.commandLog, `${path}.commandLog`, issues);
}

function validateRuntimeSlice<T>(
  value: unknown,
  path: string,
  allowMissing: boolean,
  validator: (slice: unknown, path: string, issues: SaveValidationIssue[]) => void,
  issues: SaveValidationIssue[]
): void {
  if (value === undefined && allowMissing) {
    return;
  }

  validator(value, path, issues);
}

function validateSeedState(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  const seed = readRecord(value, path, issues);
  if (seed === undefined) {
    return;
  }

  requireNonEmptyString(seed.seed, `${path}.seed`, issues);
  requireNonNegativeInteger(seed.value, `${path}.value`, issues);
  requireNonNegativeInteger(seed.rolls, `${path}.rolls`, issues);
}

function validateGameTime(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  const time = readRecord(value, path, issues);
  if (time === undefined) {
    return;
  }

  requirePositiveInteger(time.day, `${path}.day`, issues);
  requireNonNegativeInteger(time.minuteOfDay, `${path}.minuteOfDay`, issues);
  requireNonNegativeInteger(time.elapsedMinutes, `${path}.elapsedMinutes`, issues);
}

function validatePlayerState(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  const player = readRecord(value, path, issues);
  if (player === undefined) {
    return;
  }

  requireNonNegativeInteger(player.energy, `${path}.energy`, issues);
  requireNonNegativeInteger(player.wallet, `${path}.wallet`, issues);
  validateInventory(player.inventory, `${path}.inventory`, issues);
}

function validateInventory(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  const inventory = readRecord(value, path, issues);
  if (inventory === undefined) {
    return;
  }

  for (const [itemId, quantity] of Object.entries(inventory)) {
    if (itemId.trim().length === 0) {
      issues.push({
        path,
        message: "Inventory item ids must be non-empty strings."
      });
    }
    requireNonNegativeInteger(quantity, `${path}.${itemId}`, issues);
  }
}

function validateFarmState(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  const farm = readRecord(value, path, issues);
  if (farm === undefined) {
    return;
  }

  requirePositiveInteger(farm.width, `${path}.width`, issues);
  requirePositiveInteger(farm.height, `${path}.height`, issues);
  validateArray(farm.tiles, `${path}.tiles`, validateFarmTile, issues);
  validateArray(farm.cropDefinitions, `${path}.cropDefinitions`, validateCropDefinition, issues);
}

function validateFarmTile(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  const tile = readRecord(value, path, issues);
  if (tile === undefined) {
    return;
  }

  requireNonNegativeInteger(tile.x, `${path}.x`, issues);
  requireNonNegativeInteger(tile.y, `${path}.y`, issues);

  if (typeof tile.state !== "string" || !Object.values(FARM_TILE_STATES).includes(tile.state as never)) {
    issues.push({
      path: `${path}.state`,
      message: "Farm tile state must be a known farm tile state."
    });
  }

  validateOptionalString(tile.cropId, `${path}.cropId`, issues);
  validateOptionalString(tile.seedItemId, `${path}.seedItemId`, issues);
  validateOptionalString(tile.harvestItemId, `${path}.harvestItemId`, issues);
  validateOptionalNonNegativeInteger(tile.plantedDay, `${path}.plantedDay`, issues);
  validateOptionalNonNegativeInteger(tile.wateredOnDay, `${path}.wateredOnDay`, issues);
  validateOptionalNonNegativeInteger(tile.growthDaysWatered, `${path}.growthDaysWatered`, issues);
  validateOptionalNonNegativeInteger(tile.readyDay, `${path}.readyDay`, issues);
}

function validateCropDefinition(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  const crop = readRecord(value, path, issues);
  if (crop === undefined) {
    return;
  }

  requireNonEmptyString(crop.id, `${path}.id`, issues);
  requireNonEmptyString(crop.seedItemId, `${path}.seedItemId`, issues);
  requireNonEmptyString(crop.harvestItemId, `${path}.harvestItemId`, issues);
  requirePositiveInteger(crop.growthDays, `${path}.growthDays`, issues);
  requirePositiveInteger(crop.harvestQuantity, `${path}.harvestQuantity`, issues);
  requireBoolean(crop.requiresWater, `${path}.requiresWater`, issues);

  if (
    crop.postHarvestTileState !== FARM_TILE_STATES.UNTILLED &&
    crop.postHarvestTileState !== FARM_TILE_STATES.TILLED
  ) {
    issues.push({
      path: `${path}.postHarvestTileState`,
      message: "Post-harvest tile state must be untilled or tilled."
    });
  }
}

function validateMineState(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  const mine = readRecord(value, path, issues);
  if (mine === undefined) {
    return;
  }

  requirePositiveInteger(mine.deepestFloorReached, `${path}.deepestFloorReached`, issues);
  const daily = readRecord(mine.daily, `${path}.daily`, issues);
  if (daily === undefined) {
    return;
  }

  requirePositiveInteger(daily.day, `${path}.daily.day`, issues);
  requirePositiveInteger(daily.floor, `${path}.daily.floor`, issues);
  validateStringArray(daily.depletedNodeIds, `${path}.daily.depletedNodeIds`, issues);
  requireBoolean(daily.exitRevealed, `${path}.daily.exitRevealed`, issues);
}

function validateShopsState(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  const shops = readRecord(value, path, issues);
  if (shops === undefined) {
    return;
  }

  validateArray(
    shops.shops,
    `${path}.shops`,
    (shopValue, shopPath, shopIssues) => {
      const shop = readRecord(shopValue, shopPath, shopIssues);
      if (shop === undefined) {
        return;
      }

      requireNonEmptyString(shop.shopId, `${shopPath}.shopId`, shopIssues);
      validateInventory(shop.stock, `${shopPath}.stock`, shopIssues);
      requireNonNegativeInteger(shop.budget, `${shopPath}.budget`, shopIssues);
      requirePositiveInteger(shop.nextRestockDay, `${shopPath}.nextRestockDay`, shopIssues);
    },
    issues
  );
}

function validateContractsState(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  const contracts = readRecord(value, path, issues);
  if (contracts === undefined) {
    return;
  }

  validateArray(
    contracts.active,
    `${path}.active`,
    (contractValue, contractPath, contractIssues) => {
      const contract = readRecord(contractValue, contractPath, contractIssues);
      if (contract === undefined) {
        return;
      }

      requireNonEmptyString(contract.contractId, `${contractPath}.contractId`, contractIssues);
      requireNonEmptyString(contract.requesterId, `${contractPath}.requesterId`, contractIssues);

      if (
        contract.status !== "active" &&
        contract.status !== "completed" &&
        contract.status !== "expired"
      ) {
        contractIssues.push({
          path: `${contractPath}.status`,
          message: "Contract status must be active, completed, or expired."
        });
      }

      requirePositiveInteger(contract.acceptedDay, `${contractPath}.acceptedDay`, contractIssues);
      requirePositiveInteger(contract.deadlineDay, `${contractPath}.deadlineDay`, contractIssues);
      requireNonNegativeInteger(contract.progress, `${contractPath}.progress`, contractIssues);
    },
    issues
  );
  validateStringArray(contracts.completedIds, `${path}.completedIds`, issues);
  validateArray(
    contracts.cooldowns,
    `${path}.cooldowns`,
    (cooldownValue, cooldownPath, cooldownIssues) => {
      const cooldown = readRecord(cooldownValue, cooldownPath, cooldownIssues);
      if (cooldown === undefined) {
        return;
      }

      requireNonEmptyString(cooldown.contractId, `${cooldownPath}.contractId`, cooldownIssues);
      requirePositiveInteger(cooldown.availableDay, `${cooldownPath}.availableDay`, cooldownIssues);
    },
    issues
  );
}

function validateNpcMemoryState(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  const npcs = readRecord(value, path, issues);
  if (npcs === undefined) {
    return;
  }

  validateStringArray(npcs.metNpcIds, `${path}.metNpcIds`, issues);
  validateStringArray(npcs.memoryFlags, `${path}.memoryFlags`, issues);
}

function validateRelationshipsState(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  const relationships = readRecord(value, path, issues);
  if (relationships === undefined) {
    return;
  }

  validateArray(
    relationships.affinity,
    `${path}.affinity`,
    (affinityValue, affinityPath, affinityIssues) => {
      const affinity = readRecord(affinityValue, affinityPath, affinityIssues);
      if (affinity === undefined) {
        return;
      }

      requireNonEmptyString(affinity.npcId, `${affinityPath}.npcId`, affinityIssues);
      requireIntegerInRange(affinity.affinity, 0, 100, `${affinityPath}.affinity`, affinityIssues);
    },
    issues
  );
  validateArray(
    relationships.dailyGains,
    `${path}.dailyGains`,
    (gainValue, gainPath, gainIssues) => {
      const gain = readRecord(gainValue, gainPath, gainIssues);
      if (gain === undefined) {
        return;
      }

      requireNonEmptyString(gain.npcId, `${gainPath}.npcId`, gainIssues);
      requirePositiveInteger(gain.day, `${gainPath}.day`, gainIssues);
      requireNonNegativeInteger(gain.amount, `${gainPath}.amount`, gainIssues);
    },
    issues
  );
  validateStringArray(relationships.milestoneFlags, `${path}.milestoneFlags`, issues);
}

function validateStoryState(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  const story = readRecord(value, path, issues);
  if (story === undefined) {
    return;
  }

  validateStringArray(story.completedEventIds, `${path}.completedEventIds`, issues);
  validateStringArray(story.flags, `${path}.flags`, issues);
}

function validateDecorState(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  const decor = readRecord(value, path, issues);
  if (decor === undefined) {
    return;
  }

  validateArray(decor.placements, `${path}.placements`, validateDecorPlacementState, issues);
}

function validateDecorPlacementState(
  value: unknown,
  path: string,
  issues: SaveValidationIssue[]
): void {
  const placement = readRecord(value, path, issues);
  if (placement === undefined) {
    return;
  }

  requireNonEmptyString(placement.placementId, `${path}.placementId`, issues);
  requireNonEmptyString(placement.itemId, `${path}.itemId`, issues);
  requireNonEmptyString(placement.areaId, `${path}.areaId`, issues);
  requireNonNegativeInteger(placement.x, `${path}.x`, issues);
  requireNonNegativeInteger(placement.y, `${path}.y`, issues);

  if (
    placement.rotation !== 0 &&
    placement.rotation !== 90 &&
    placement.rotation !== 180 &&
    placement.rotation !== 270
  ) {
    issues.push({
      path: `${path}.rotation`,
      message: "Decor rotation must be 0, 90, 180, or 270."
    });
  }
}

function validateCommandLogState(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  const commandLog = readRecord(value, path, issues);
  if (commandLog === undefined) {
    return;
  }

  requireNonNegativeInteger(commandLog.nextSequence, `${path}.nextSequence`, issues);
  requireNonNegativeInteger(commandLog.appliedCount, `${path}.appliedCount`, issues);
}

function validateArray(
  value: unknown,
  path: string,
  itemValidator: (item: unknown, path: string, issues: SaveValidationIssue[]) => void,
  issues: SaveValidationIssue[]
): void {
  if (!Array.isArray(value)) {
    issues.push({
      path,
      message: "Value must be an array."
    });
    return;
  }

  value.forEach((item, index) => {
    itemValidator(item, `${path}[${index}]`, issues);
  });
}

function validateObjectArray(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  validateArray(
    value,
    path,
    (item, itemPath, itemIssues) => {
      readRecord(item, itemPath, itemIssues);
    },
    issues
  );
}

function validateStringArray(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  validateArray(
    value,
    path,
    (item, itemPath, itemIssues) => {
      requireNonEmptyString(item, itemPath, itemIssues);
    },
    issues
  );
}

function validateOptionalString(
  value: unknown,
  path: string,
  issues: SaveValidationIssue[]
): void {
  if (value === undefined) {
    return;
  }

  requireNonEmptyString(value, path, issues);
}

function validateOptionalNonNegativeInteger(
  value: unknown,
  path: string,
  issues: SaveValidationIssue[]
): void {
  if (value === undefined) {
    return;
  }

  requireNonNegativeInteger(value, path, issues);
}

function readRecord(
  value: unknown,
  path: string,
  issues: SaveValidationIssue[]
): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    issues.push({
      path,
      message: "Value must be an object."
    });
    return undefined;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(
  value: unknown,
  path: string,
  issues: SaveValidationIssue[]
): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({
      path,
      message: "Value must be a non-empty string."
    });
  }
}

function requireBoolean(value: unknown, path: string, issues: SaveValidationIssue[]): void {
  if (typeof value !== "boolean") {
    issues.push({
      path,
      message: "Value must be a boolean."
    });
  }
}

function requireExactNumber(
  value: unknown,
  expected: number,
  path: string,
  issues: SaveValidationIssue[]
): void {
  if (value !== expected) {
    issues.push({
      path,
      message: `Value must be ${expected}.`
    });
  }
}

function requirePositiveInteger(
  value: unknown,
  path: string,
  issues: SaveValidationIssue[]
): void {
  requireIntegerInRange(value, 1, Number.MAX_SAFE_INTEGER, path, issues);
}

function requireNonNegativeInteger(
  value: unknown,
  path: string,
  issues: SaveValidationIssue[]
): void {
  requireIntegerInRange(value, 0, Number.MAX_SAFE_INTEGER, path, issues);
}

function requireIntegerInRange(
  value: unknown,
  min: number,
  max: number,
  path: string,
  issues: SaveValidationIssue[]
): void {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) {
    issues.push({
      path,
      message: `Value must be an integer from ${min} to ${max}.`
    });
  }
}
