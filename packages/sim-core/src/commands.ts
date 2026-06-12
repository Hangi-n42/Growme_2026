import type { Inventory, SimCommand, SimEvent, SimResult, SimState } from "./types";

export function applyCommand(state: SimState, command: SimCommand): SimResult {
  switch (command.type) {
    case "advanceTime":
      return advanceTime(state, command.minutes);
    case "debugAddItem":
      return debugAddItem(state, command.itemId, command.quantity);
    case "saveSnapshot":
      return succeed(state, {
        type: "save.snapshotRequested",
        message: "Save snapshot requested."
      });
    default:
      return fail(state, "Unknown command.");
  }
}

function advanceTime(state: SimState, minutes: number): SimResult {
  if (!Number.isInteger(minutes) || minutes <= 0) {
    return fail(state, "Advance time requires a positive integer minute count.");
  }

  const totalMinutes = state.minute + minutes;
  const elapsedDays = Math.floor(totalMinutes / 1440);
  const nextState: SimState = {
    ...state,
    day: state.day + elapsedDays,
    minute: totalMinutes % 1440
  };

  return succeed(nextState, {
    type: "time.advanced",
    message: "Simulation time advanced.",
    data: { minutes }
  });
}

function debugAddItem(state: SimState, itemId: string, quantity: number): SimResult {
  if (itemId.length === 0 || !Number.isInteger(quantity) || quantity <= 0) {
    return fail(state, "Debug add item requires an item id and positive integer quantity.");
  }

  const inventory: Inventory = {
    ...state.player.inventory,
    [itemId]: (state.player.inventory[itemId] ?? 0) + quantity
  };

  const nextState: SimState = {
    ...state,
    player: {
      ...state.player,
      inventory
    }
  };

  return succeed(nextState, {
    type: "inventory.debugAdded",
    message: "Debug item added for scaffold smoke coverage.",
    data: { itemId, quantity }
  });
}

function succeed(state: SimState, event: SimEvent): SimResult {
  const nextState: SimState = {
    ...state,
    eventLog: [...state.eventLog, event]
  };

  return {
    ok: true,
    state: nextState,
    events: [event]
  };
}

function fail(state: SimState, error: string): SimResult {
  const event: SimEvent = {
    type: "command.failed",
    message: error
  };

  return {
    ok: false,
    state,
    events: [event],
    error
  };
}
