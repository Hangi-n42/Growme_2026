import { describe, expect, it } from "vitest";
import {
  MAX_WALLET_BALANCE,
  addInventoryItem,
  applyPlayerTransaction,
  createInitialState,
  creditWalletCurrency,
  debitWalletCurrency,
  deserializeState,
  getItemQuantity,
  hasInventoryItem,
  hasWalletCurrency,
  removeInventoryItem,
  serializeState,
  type ItemStackLimitLookup,
  type PlayerState
} from "../src";

const STACK_LIMITS: ItemStackLimitLookup = {
  turnip_seed: 99,
  wild_fiber: 5,
  fieldstone: 10
};

function createPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  const state = createInitialState({ seed: "inventory-test" });

  return {
    ...state.player,
    ...overrides,
    inventory: {
      ...state.player.inventory,
      ...overrides.inventory
    }
  };
}

describe("inventory and wallet helpers", () => {
  it("adds, checks, and removes item quantities within stack limits", () => {
    const player = createPlayer();
    const added = addInventoryItem(player, "wild_fiber", 3, STACK_LIMITS);

    expect(added.ok).toBe(true);

    if (added.ok) {
      expect(getItemQuantity(added.player.inventory, "wild_fiber")).toBe(3);
      expect(hasInventoryItem(added.player.inventory, "wild_fiber", 2)).toBe(true);

      const removed = removeInventoryItem(added.player, "wild_fiber", 3, STACK_LIMITS);

      expect(removed.ok).toBe(true);
      if (removed.ok) {
        expect(removed.player.inventory).not.toHaveProperty("wild_fiber");
      }
    }
  });

  it("rejects stack overflow without mutating the player", () => {
    const player = createPlayer({
      inventory: {
        wild_fiber: 4
      }
    });

    const result = addInventoryItem(player, "wild_fiber", 2, STACK_LIMITS);

    expect(result.ok).toBe(false);
    expect(result.player).toBe(player);
    expect(player.inventory.wild_fiber).toBe(4);

    if (!result.ok) {
      expect(result.failure.code).toBe("STACK_LIMIT_EXCEEDED");
    }
  });

  it("rejects unknown items and invalid item quantities", () => {
    const player = createPlayer();
    const unknown = addInventoryItem(player, "missing_item", 1, STACK_LIMITS);
    const invalidQuantity = addInventoryItem(player, "wild_fiber", 0, STACK_LIMITS);

    expect(unknown.ok).toBe(false);
    expect(invalidQuantity.ok).toBe(false);

    if (!unknown.ok) {
      expect(unknown.failure.code).toBe("UNKNOWN_ITEM");
    }

    if (!invalidQuantity.ok) {
      expect(invalidQuantity.failure.code).toBe("INVALID_ITEM_QUANTITY");
    }
  });

  it("rejects removing more items than the inventory contains", () => {
    const player = createPlayer({
      inventory: {
        fieldstone: 2
      }
    });

    const result = removeInventoryItem(player, "fieldstone", 3, STACK_LIMITS);

    expect(result.ok).toBe(false);
    expect(result.player).toBe(player);
    expect(player.inventory.fieldstone).toBe(2);

    if (!result.ok) {
      expect(result.failure.code).toBe("INSUFFICIENT_ITEM_QUANTITY");
    }
  });

  it("credits and debits wallet currency with integer non-negative validation", () => {
    const player = createPlayer({ wallet: 100 });
    const debited = debitWalletCurrency(player, 35);

    expect(debited.ok).toBe(true);

    if (debited.ok) {
      expect(debited.player.wallet).toBe(65);
      expect(hasWalletCurrency(debited.player, 65)).toBe(true);

      const credited = creditWalletCurrency(debited.player, 10);

      expect(credited.ok).toBe(true);
      if (credited.ok) {
        expect(credited.player.wallet).toBe(75);
      }
    }
  });

  it("rejects insufficient funds, fractional currency, and overflow", () => {
    const player = createPlayer({ wallet: 5 });
    const insufficient = debitWalletCurrency(player, 6);
    const fractional = creditWalletCurrency(player, 1.5);
    const overflow = creditWalletCurrency(createPlayer({ wallet: MAX_WALLET_BALANCE }), 1);

    expect(insufficient.ok).toBe(false);
    expect(fractional.ok).toBe(false);
    expect(overflow.ok).toBe(false);

    if (!insufficient.ok) {
      expect(insufficient.failure.code).toBe("INSUFFICIENT_FUNDS");
    }

    if (!fractional.ok) {
      expect(fractional.failure.code).toBe("INVALID_CURRENCY_AMOUNT");
    }

    if (!overflow.ok) {
      expect(overflow.failure.code).toBe("CURRENCY_OVERFLOW");
    }
  });

  it("rolls back mixed inventory and wallet transactions atomically", () => {
    const player = createPlayer({
      wallet: 20,
      inventory: {
        turnip_seed: 1
      }
    });

    const result = applyPlayerTransaction(
      player,
      {
        inventory: [
          { kind: "add", itemId: "wild_fiber", quantity: 2 },
          { kind: "remove", itemId: "turnip_seed", quantity: 2 }
        ],
        wallet: [{ kind: "debit", amount: 5 }]
      },
      STACK_LIMITS
    );

    expect(result.ok).toBe(false);
    expect(result.player).toBe(player);
    expect(player.wallet).toBe(20);
    expect(player.inventory).toEqual({ turnip_seed: 1 });

    if (!result.ok) {
      expect(result.failure.code).toBe("INSUFFICIENT_ITEM_QUANTITY");
    }
  });

  it("keeps inventory and wallet serializable through save snapshots", () => {
    const state = createInitialState({ seed: "inventory-save" });
    const result = applyPlayerTransaction(
      state.player,
      {
        inventory: [
          { kind: "add", itemId: "wild_fiber", quantity: 2 },
          { kind: "add", itemId: "fieldstone", quantity: 3 }
        ],
        wallet: [{ kind: "credit", amount: 25 }]
      },
      STACK_LIMITS
    );

    expect(result.ok).toBe(true);

    if (result.ok) {
      const nextState = {
        ...state,
        player: result.player
      };

      expect(deserializeState(serializeState(nextState))).toEqual(nextState);
    }
  });
});
