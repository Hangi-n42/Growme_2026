import {
  DEFAULT_MAX_ENERGY,
  type CommandFailure,
  type GameCommandType,
  type JsonObject,
  type PlayerState
} from "./types";

export const TOOL_ACTION_CATEGORIES = {
  FARM: "farm",
  GATHER: "gather",
  MINE: "mine",
  CLEAR: "clear",
  HAZARD: "hazard"
} as const;

export type ToolActionCategory =
  (typeof TOOL_ACTION_CATEGORIES)[keyof typeof TOOL_ACTION_CATEGORIES];

export interface ToolActionEnergyDefinition {
  readonly category: ToolActionCategory;
  readonly energyCost: number;
}

export const TOOL_ACTION_ENERGY_COSTS = {
  till: {
    category: TOOL_ACTION_CATEGORIES.FARM,
    energyCost: 4
  },
  plant: {
    category: TOOL_ACTION_CATEGORIES.FARM,
    energyCost: 2
  },
  water: {
    category: TOOL_ACTION_CATEGORIES.FARM,
    energyCost: 2
  },
  harvest: {
    category: TOOL_ACTION_CATEGORIES.FARM,
    energyCost: 3
  },
  clear: {
    category: TOOL_ACTION_CATEGORIES.CLEAR,
    energyCost: 5
  },
  gather: {
    category: TOOL_ACTION_CATEGORIES.GATHER,
    energyCost: 5
  },
  mine: {
    category: TOOL_ACTION_CATEGORIES.MINE,
    energyCost: 7
  },
  hazard: {
    category: TOOL_ACTION_CATEGORIES.HAZARD,
    energyCost: 10
  }
} as const satisfies Record<string, ToolActionEnergyDefinition>;

export type ToolActionKind = keyof typeof TOOL_ACTION_ENERGY_COSTS;

export type ToolActionEnergyCheck =
  | {
      readonly ok: true;
      readonly actionKind: ToolActionKind;
      readonly actionCategory: ToolActionCategory;
      readonly energy: number;
      readonly requiredEnergy: number;
      readonly remainingEnergy: number;
    }
  | {
      readonly ok: false;
      readonly actionKind: ToolActionKind;
      readonly actionCategory: ToolActionCategory;
      readonly energy: number;
      readonly requiredEnergy: number;
      readonly deficit: number;
    };

export function getToolActionEnergyCost(actionKind: ToolActionKind): number {
  return TOOL_ACTION_ENERGY_COSTS[actionKind].energyCost;
}

export function getToolActionCategory(actionKind: ToolActionKind): ToolActionCategory {
  return TOOL_ACTION_ENERGY_COSTS[actionKind].category;
}

export function checkToolActionEnergy(
  player: Pick<PlayerState, "energy">,
  actionKind: ToolActionKind
): ToolActionEnergyCheck {
  const requiredEnergy = getToolActionEnergyCost(actionKind);
  const actionCategory = getToolActionCategory(actionKind);

  if (player.energy < requiredEnergy) {
    return {
      ok: false,
      actionKind,
      actionCategory,
      energy: player.energy,
      requiredEnergy,
      deficit: requiredEnergy - player.energy
    };
  }

  return {
    ok: true,
    actionKind,
    actionCategory,
    energy: player.energy,
    requiredEnergy,
    remainingEnergy: player.energy - requiredEnergy
  };
}

export function createToolActionEnergyPayload(actionKind: ToolActionKind): JsonObject {
  return {
    actionKind,
    actionCategory: getToolActionCategory(actionKind),
    energyCost: getToolActionEnergyCost(actionKind)
  };
}

export function createInsufficientToolActionEnergyFailure(
  player: Pick<PlayerState, "energy">,
  actionKind: ToolActionKind,
  commandType: GameCommandType
): CommandFailure | undefined {
  const check = checkToolActionEnergy(player, actionKind);

  if (check.ok) {
    return undefined;
  }

  return {
    code: "INSUFFICIENT_ENERGY",
    commandType,
    message: "Player does not have enough energy for this action.",
    payload: {
      actionKind: check.actionKind,
      actionCategory: check.actionCategory,
      energy: check.energy,
      requiredEnergy: check.requiredEnergy,
      deficit: check.deficit,
      maxEnergy: DEFAULT_MAX_ENERGY
    }
  };
}

export function spendToolActionEnergy(
  player: PlayerState,
  actionKind: ToolActionKind
): PlayerState {
  return {
    ...player,
    energy: player.energy - getToolActionEnergyCost(actionKind)
  };
}

export function restoreDailyEnergy(
  player: PlayerState,
  maxEnergy: number = DEFAULT_MAX_ENERGY
): PlayerState {
  return {
    ...player,
    energy: maxEnergy
  };
}
