import {
  advanceGameTime,
  createGameTime,
  getCrossedDayNumbers,
  getMinutesUntilNextDayStart,
  validateTimeAdvanceMinutes
} from "./time";
import {
  FARM_ENERGY_COSTS,
  advanceFarmByCrossedDays,
  createClearedFarmTile,
  createHarvestedFarmTile,
  createPlantedFarmTile,
  createTilledFarmTile,
  createWateredFarmTile,
  findFarmTile,
  getCropDefinition,
  getCropDefinitionForSeed,
  getFarmItemStackLimits,
  replaceFarmTile,
  type FarmDayTransitionChange
} from "./farm";
import { applyPlayerTransaction } from "./inventory";
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
  JsonObject,
  CropDefinition,
  FarmTile
} from "./types";
import { DEFAULT_MAX_ENERGY, FARM_TILE_STATES, GAME_EVENT_TYPES, MINUTES_PER_DAY } from "./types";

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
    case "TILL_TILE":
      return tillTile(state, command);
    case "PLANT_CROP":
      return plantCrop(state, command);
    case "WATER_CROP":
      return waterCrop(state, command);
    case "HARVEST_CROP":
      return harvestCrop(state, command);
    case "CLEAR_TILE":
      return clearTile(state, command);
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
  const crossedDays = getCrossedDayNumbers(state.time, time);
  const farmTransition = advanceFarmByCrossedDays(state.farm, crossedDays);
  const timedState = withGameTime(
    {
      ...state,
      farm: farmTransition.farm
    },
    time
  );
  const events = createTimeAdvanceEvents(
    state,
    state.time,
    time,
    "ADVANCE_TIME",
    minutes,
    "advanceTime"
  );
  const farmEvents = createFarmTransitionEvents(
    state,
    "ADVANCE_TIME",
    farmTransition.changes,
    events.length
  );

  return succeedCommand(timedState, command as GameCommand, "ADVANCE_TIME", [
    ...events,
    ...farmEvents
  ]);
}

function sleepToNextDay(state: GameState, command: CommandRecord): GameCommandResult {
  const minutes = getMinutesUntilNextDayStart(state.time);
  const time = advanceGameTime(state.time, minutes);
  const crossedDays = getCrossedDayNumbers(state.time, time);
  const farmTransition = advanceFarmByCrossedDays(state.farm, crossedDays);
  const sleptState = withGameTime(
    {
      ...state,
      farm: farmTransition.farm,
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
  const farmEvents = createFarmTransitionEvents(
    state,
    "SLEEP_TO_NEXT_DAY",
    farmTransition.changes,
    events.length
  );

  return succeedCommand(sleptState, command as GameCommand, "SLEEP_TO_NEXT_DAY", [
    ...events,
    ...farmEvents
  ]);
}

function tillTile(state: GameState, command: CommandRecord): GameCommandResult {
  const tileOrFailure = readFarmTileOrFailure(state, command, "TILL_TILE");

  if (isCommandFailure(tileOrFailure)) {
    return failCommand(state, command, tileOrFailure);
  }

  if (tileOrFailure.state === FARM_TILE_STATES.BLOCKED) {
    return failCommand(state, command, {
      code: "FARM_TILE_BLOCKED",
      commandType: "TILL_TILE",
      message: "Blocked farm tiles must be cleared before tilling.",
      payload: { x: tileOrFailure.x, y: tileOrFailure.y }
    });
  }

  if (tileOrFailure.state !== FARM_TILE_STATES.UNTILLED) {
    return failCommand(state, command, {
      code: "FARM_TILE_NOT_TILLABLE",
      commandType: "TILL_TILE",
      message: "Only untilled farm tiles can be tilled.",
      payload: { x: tileOrFailure.x, y: tileOrFailure.y, state: tileOrFailure.state }
    });
  }

  const energyFailure = validateEnergy(state, FARM_ENERGY_COSTS.till, "TILL_TILE");
  if (energyFailure !== undefined) {
    return failCommand(state, command, energyFailure);
  }

  const nextState = {
    ...state,
    player: spendPlayerEnergy(state, FARM_ENERGY_COSTS.till),
    farm: replaceFarmTile(state.farm, createTilledFarmTile(tileOrFailure))
  };

  return succeedCommand(nextState, command as GameCommand, "TILL_TILE", [
    createGameEvent(
      state,
      state.time,
      "TILL_TILE",
      GAME_EVENT_TYPES.FARM_TILE_TILLED,
      "farm",
      "Farm tile tilled.",
      {
        x: tileOrFailure.x,
        y: tileOrFailure.y,
        energyCost: FARM_ENERGY_COSTS.till
      },
      0
    )
  ]);
}

function plantCrop(state: GameState, command: CommandRecord): GameCommandResult {
  const tileOrFailure = readFarmTileOrFailure(state, command, "PLANT_CROP");

  if (isCommandFailure(tileOrFailure)) {
    return failCommand(state, command, tileOrFailure);
  }

  const seedItemId = readSeedItemId(command);
  if (seedItemId === undefined) {
    return failCommand(state, command, {
      code: "INVALID_SEED_ITEM",
      commandType: "PLANT_CROP",
      message: "PLANT_CROP requires a non-empty seedItemId.",
      payload: {}
    });
  }

  const crop = getCropDefinitionForSeed(state.farm, seedItemId);
  if (crop === undefined) {
    return failCommand(state, command, {
      code: "UNKNOWN_CROP_SEED",
      commandType: "PLANT_CROP",
      message: `No crop definition exists for seed item: ${seedItemId}.`,
      payload: { seedItemId }
    });
  }

  if (tileOrFailure.state !== FARM_TILE_STATES.TILLED) {
    return failCommand(state, command, {
      code:
        tileOrFailure.state === FARM_TILE_STATES.BLOCKED
          ? "FARM_TILE_BLOCKED"
          : "FARM_TILE_NOT_PLANTABLE",
      commandType: "PLANT_CROP",
      message: "Crops can only be planted on tilled farm tiles.",
      payload: { x: tileOrFailure.x, y: tileOrFailure.y, state: tileOrFailure.state }
    });
  }

  const energyFailure = validateEnergy(state, FARM_ENERGY_COSTS.plant, "PLANT_CROP");
  if (energyFailure !== undefined) {
    return failCommand(state, command, energyFailure);
  }

  const transaction = applyPlayerTransaction(
    state.player,
    {
      inventory: [{ kind: "remove", itemId: seedItemId, quantity: 1 }]
    },
    getFarmItemStackLimits(state.farm)
  );

  if (!transaction.ok) {
    return failCommand(state, command, {
      code: "INVENTORY_TRANSACTION_FAILED",
      commandType: "PLANT_CROP",
      message: transaction.error,
      payload: {
        inventoryFailureCode: transaction.failure.code,
        seedItemId
      }
    });
  }

  const nextState = {
    ...state,
    player: {
      ...transaction.player,
      energy: transaction.player.energy - FARM_ENERGY_COSTS.plant
    },
    farm: replaceFarmTile(state.farm, createPlantedFarmTile(tileOrFailure, crop, state.day))
  };

  return succeedCommand(nextState, command as GameCommand, "PLANT_CROP", [
    createGameEvent(
      state,
      state.time,
      "PLANT_CROP",
      GAME_EVENT_TYPES.FARM_CROP_PLANTED,
      "farm",
      "Crop planted.",
      {
        x: tileOrFailure.x,
        y: tileOrFailure.y,
        cropId: crop.id,
        seedItemId,
        energyCost: FARM_ENERGY_COSTS.plant
      },
      0
    )
  ]);
}

function waterCrop(state: GameState, command: CommandRecord): GameCommandResult {
  const tileOrFailure = readFarmTileOrFailure(state, command, "WATER_CROP");

  if (isCommandFailure(tileOrFailure)) {
    return failCommand(state, command, tileOrFailure);
  }

  if (tileOrFailure.state !== FARM_TILE_STATES.PLANTED) {
    return failCommand(state, command, {
      code:
        tileOrFailure.state === FARM_TILE_STATES.BLOCKED
          ? "FARM_TILE_BLOCKED"
          : "FARM_TILE_NOT_WATERABLE",
      commandType: "WATER_CROP",
      message: "Only planted, unwatered crops can be watered.",
      payload: { x: tileOrFailure.x, y: tileOrFailure.y, state: tileOrFailure.state }
    });
  }

  const crop = readTileCropOrFailure(state, tileOrFailure, "WATER_CROP");
  if (isCommandFailure(crop)) {
    return failCommand(state, command, crop);
  }

  if (!crop.requiresWater) {
    return failCommand(state, command, {
      code: "FARM_TILE_NOT_WATERABLE",
      commandType: "WATER_CROP",
      message: "This crop does not require watering.",
      payload: { x: tileOrFailure.x, y: tileOrFailure.y, cropId: crop.id }
    });
  }

  const energyFailure = validateEnergy(state, FARM_ENERGY_COSTS.water, "WATER_CROP");
  if (energyFailure !== undefined) {
    return failCommand(state, command, energyFailure);
  }

  const nextState = {
    ...state,
    player: spendPlayerEnergy(state, FARM_ENERGY_COSTS.water),
    farm: replaceFarmTile(state.farm, createWateredFarmTile(tileOrFailure, state.day))
  };

  return succeedCommand(nextState, command as GameCommand, "WATER_CROP", [
    createGameEvent(
      state,
      state.time,
      "WATER_CROP",
      GAME_EVENT_TYPES.FARM_CROP_WATERED,
      "farm",
      "Crop watered.",
      {
        x: tileOrFailure.x,
        y: tileOrFailure.y,
        cropId: crop.id,
        energyCost: FARM_ENERGY_COSTS.water
      },
      0
    )
  ]);
}

function harvestCrop(state: GameState, command: CommandRecord): GameCommandResult {
  const tileOrFailure = readFarmTileOrFailure(state, command, "HARVEST_CROP");

  if (isCommandFailure(tileOrFailure)) {
    return failCommand(state, command, tileOrFailure);
  }

  if (tileOrFailure.state !== FARM_TILE_STATES.READY) {
    return failCommand(state, command, {
      code: "CROP_NOT_READY",
      commandType: "HARVEST_CROP",
      message: "Only ready crops can be harvested.",
      payload: { x: tileOrFailure.x, y: tileOrFailure.y, state: tileOrFailure.state }
    });
  }

  const crop = readTileCropOrFailure(state, tileOrFailure, "HARVEST_CROP");
  if (isCommandFailure(crop)) {
    return failCommand(state, command, crop);
  }

  const energyFailure = validateEnergy(state, FARM_ENERGY_COSTS.harvest, "HARVEST_CROP");
  if (energyFailure !== undefined) {
    return failCommand(state, command, energyFailure);
  }

  const transaction = applyPlayerTransaction(
    state.player,
    {
      inventory: [
        {
          kind: "add",
          itemId: crop.harvestItemId,
          quantity: crop.harvestQuantity
        }
      ]
    },
    getFarmItemStackLimits(state.farm)
  );

  if (!transaction.ok) {
    return failCommand(state, command, {
      code: "INVENTORY_TRANSACTION_FAILED",
      commandType: "HARVEST_CROP",
      message: transaction.error,
      payload: {
        inventoryFailureCode: transaction.failure.code,
        harvestItemId: crop.harvestItemId
      }
    });
  }

  const nextState = {
    ...state,
    player: {
      ...transaction.player,
      energy: transaction.player.energy - FARM_ENERGY_COSTS.harvest
    },
    farm: replaceFarmTile(state.farm, createHarvestedFarmTile(tileOrFailure, crop))
  };

  return succeedCommand(nextState, command as GameCommand, "HARVEST_CROP", [
    createGameEvent(
      state,
      state.time,
      "HARVEST_CROP",
      GAME_EVENT_TYPES.FARM_CROP_HARVESTED,
      "farm",
      "Crop harvested.",
      {
        x: tileOrFailure.x,
        y: tileOrFailure.y,
        cropId: crop.id,
        harvestItemId: crop.harvestItemId,
        harvestQuantity: crop.harvestQuantity,
        energyCost: FARM_ENERGY_COSTS.harvest
      },
      0
    )
  ]);
}

function clearTile(state: GameState, command: CommandRecord): GameCommandResult {
  const tileOrFailure = readFarmTileOrFailure(state, command, "CLEAR_TILE");

  if (isCommandFailure(tileOrFailure)) {
    return failCommand(state, command, tileOrFailure);
  }

  if (tileOrFailure.state !== FARM_TILE_STATES.BLOCKED) {
    return failCommand(state, command, {
      code: "FARM_TILE_NOT_CLEARABLE",
      commandType: "CLEAR_TILE",
      message: "Only blocked farm tiles can be cleared.",
      payload: { x: tileOrFailure.x, y: tileOrFailure.y, state: tileOrFailure.state }
    });
  }

  const energyFailure = validateEnergy(state, FARM_ENERGY_COSTS.clear, "CLEAR_TILE");
  if (energyFailure !== undefined) {
    return failCommand(state, command, energyFailure);
  }

  const nextState = {
    ...state,
    player: spendPlayerEnergy(state, FARM_ENERGY_COSTS.clear),
    farm: replaceFarmTile(state.farm, createClearedFarmTile(tileOrFailure))
  };

  return succeedCommand(nextState, command as GameCommand, "CLEAR_TILE", [
    createGameEvent(
      state,
      state.time,
      "CLEAR_TILE",
      GAME_EVENT_TYPES.FARM_TILE_CLEARED,
      "farm",
      "Blocked farm tile cleared.",
      {
        x: tileOrFailure.x,
        y: tileOrFailure.y,
        energyCost: FARM_ENERGY_COSTS.clear
      },
      0
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

function createFarmTransitionEvents(
  state: GameState,
  commandType: GameCommandType,
  changes: readonly FarmDayTransitionChange[],
  sequenceOffset: number
): readonly GameEvent[] {
  return changes.map((change, index) => {
    const eventType =
      change.nextState === FARM_TILE_STATES.READY
        ? GAME_EVENT_TYPES.FARM_CROP_READY
        : GAME_EVENT_TYPES.FARM_CROP_GROWTH_ADVANCED;

    return createGameEvent(
      state,
      createGameTime(change.day, 0),
      commandType,
      eventType,
      "farm",
      change.nextState === FARM_TILE_STATES.READY
        ? "Crop is ready to harvest."
        : "Crop growth advanced.",
      {
        x: change.x,
        y: change.y,
        cropId: change.cropId,
        previousState: change.previousState,
        nextState: change.nextState,
        growthDaysWatered: change.growthDaysWatered,
        day: change.day
      },
      sequenceOffset + index
    );
  });
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

  if (type === "TILL_TILE" || type === "tillTile") {
    return "TILL_TILE";
  }

  if (type === "PLANT_CROP" || type === "plantCrop") {
    return "PLANT_CROP";
  }

  if (type === "WATER_CROP" || type === "waterCrop") {
    return "WATER_CROP";
  }

  if (type === "HARVEST_CROP" || type === "harvestCrop") {
    return "HARVEST_CROP";
  }

  if (type === "CLEAR_TILE" || type === "clearTile") {
    return "CLEAR_TILE";
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

function readFarmTileOrFailure(
  state: GameState,
  command: CommandRecord,
  commandType: GameCommandType
): FarmTile | CommandFailure {
  if (!isNonNegativeSafeInteger(command.x) || !isNonNegativeSafeInteger(command.y)) {
    return {
      code: "INVALID_TILE_COORDINATES",
      commandType,
      message: `${commandType} requires non-negative integer x and y coordinates.`,
      payload: {}
    };
  }

  const tile = findFarmTile(state.farm, command.x, command.y);
  if (tile === undefined) {
    return {
      code: "INVALID_TILE_COORDINATES",
      commandType,
      message: "Farm tile coordinates are outside the farm bounds.",
      payload: { x: command.x, y: command.y }
    };
  }

  return tile;
}

function readTileCropOrFailure(
  state: GameState,
  tile: FarmTile,
  commandType: GameCommandType
): CropDefinition | CommandFailure {
  if (tile.cropId === undefined) {
    return {
      code: "UNKNOWN_CROP",
      commandType,
      message: "Farm tile does not reference a crop.",
      payload: { x: tile.x, y: tile.y }
    } satisfies CommandFailure;
  }

  const crop = getCropDefinition(state.farm, tile.cropId);
  if (crop === undefined) {
    return {
      code: "UNKNOWN_CROP",
      commandType,
      message: `Unknown crop id on farm tile: ${tile.cropId}.`,
      payload: { x: tile.x, y: tile.y, cropId: tile.cropId }
    } satisfies CommandFailure;
  }

  return crop;
}

function readSeedItemId(command: CommandRecord): string | undefined {
  return typeof command.seedItemId === "string" && command.seedItemId.trim().length > 0
    ? command.seedItemId
    : undefined;
}

function validateEnergy(
  state: GameState,
  energyCost: number,
  commandType: GameCommandType
): CommandFailure | undefined {
  if (state.player.energy < energyCost) {
    return {
      code: "INSUFFICIENT_ENERGY",
      commandType,
      message: "Player does not have enough energy for this farm action.",
      payload: {
        energy: state.player.energy,
        requiredEnergy: energyCost
      }
    };
  }

  return undefined;
}

function spendPlayerEnergy(state: GameState, energyCost: number) {
  return {
    ...state.player,
    energy: state.player.energy - energyCost
  };
}

function isCommandFailure(value: FarmTile | CommandFailure | unknown): value is CommandFailure {
  return typeof value === "object" && value !== null && "code" in value && "message" in value;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
