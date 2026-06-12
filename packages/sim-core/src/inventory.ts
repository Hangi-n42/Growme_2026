import type { Inventory, ItemId, JsonObject, PlayerState } from "./types";

export const MAX_WALLET_BALANCE = Number.MAX_SAFE_INTEGER;

export type InventoryMutationKind = "add" | "remove";
export type WalletMutationKind = "credit" | "debit";

export interface ItemStackLimitLookup {
  readonly [itemId: ItemId]: number;
}

export interface ItemQuantityMutation {
  readonly itemId: ItemId;
  readonly quantity: number;
}

export interface InventoryMutation extends ItemQuantityMutation {
  readonly kind: InventoryMutationKind;
}

export interface WalletMutation {
  readonly kind: WalletMutationKind;
  readonly amount: number;
}

export interface PlayerTransaction {
  readonly inventory?: readonly InventoryMutation[];
  readonly wallet?: readonly WalletMutation[];
}

export type PlayerTransactionFailureCode =
  | "INVALID_ITEM_ID"
  | "UNKNOWN_ITEM"
  | "INVALID_ITEM_QUANTITY"
  | "INVALID_INVENTORY_QUANTITY"
  | "INVALID_STACK_LIMIT"
  | "STACK_LIMIT_EXCEEDED"
  | "INSUFFICIENT_ITEM_QUANTITY"
  | "INVALID_CURRENCY_AMOUNT"
  | "INVALID_WALLET_BALANCE"
  | "INSUFFICIENT_FUNDS"
  | "CURRENCY_OVERFLOW";

export interface PlayerTransactionFailure {
  readonly code: PlayerTransactionFailureCode;
  readonly message: string;
  readonly payload: JsonObject;
}

export interface PlayerTransactionSuccessResult {
  readonly ok: true;
  readonly status: "success";
  readonly player: PlayerState;
}

export interface PlayerTransactionFailureResult {
  readonly ok: false;
  readonly status: "failure";
  readonly player: PlayerState;
  readonly failure: PlayerTransactionFailure;
  readonly error: string;
}

export type PlayerTransactionResult =
  | PlayerTransactionSuccessResult
  | PlayerTransactionFailureResult;

export function getItemQuantity(inventory: Inventory, itemId: ItemId): number {
  return inventory[itemId] ?? 0;
}

export function hasInventoryItem(
  inventory: Inventory,
  itemId: ItemId,
  quantity: number
): boolean {
  return isPositiveSafeInteger(quantity) && getItemQuantity(inventory, itemId) >= quantity;
}

export function hasWalletCurrency(player: PlayerState, amount: number): boolean {
  return isNonNegativeSafeInteger(amount) && player.wallet >= amount;
}

export function addInventoryItem(
  player: PlayerState,
  itemId: ItemId,
  quantity: number,
  stackLimits: ItemStackLimitLookup
): PlayerTransactionResult {
  return applyPlayerTransaction(
    player,
    {
      inventory: [{ kind: "add", itemId, quantity }]
    },
    stackLimits
  );
}

export function removeInventoryItem(
  player: PlayerState,
  itemId: ItemId,
  quantity: number,
  stackLimits: ItemStackLimitLookup
): PlayerTransactionResult {
  return applyPlayerTransaction(
    player,
    {
      inventory: [{ kind: "remove", itemId, quantity }]
    },
    stackLimits
  );
}

export function creditWalletCurrency(
  player: PlayerState,
  amount: number,
  stackLimits: ItemStackLimitLookup = {}
): PlayerTransactionResult {
  return applyPlayerTransaction(
    player,
    {
      wallet: [{ kind: "credit", amount }]
    },
    stackLimits
  );
}

export function debitWalletCurrency(
  player: PlayerState,
  amount: number,
  stackLimits: ItemStackLimitLookup = {}
): PlayerTransactionResult {
  return applyPlayerTransaction(
    player,
    {
      wallet: [{ kind: "debit", amount }]
    },
    stackLimits
  );
}

export function applyPlayerTransaction(
  player: PlayerState,
  transaction: PlayerTransaction,
  stackLimits: ItemStackLimitLookup
): PlayerTransactionResult {
  const walletFailure = validateWalletBalance(player.wallet);
  if (walletFailure !== undefined) {
    return failPlayerTransaction(player, walletFailure);
  }

  const inventory: Record<ItemId, number> = { ...player.inventory };
  let wallet = player.wallet;

  for (const mutation of transaction.inventory ?? []) {
    const failure =
      mutation.kind === "add"
        ? applyInventoryAdd(inventory, mutation, stackLimits)
        : applyInventoryRemove(inventory, mutation);

    if (failure !== undefined) {
      return failPlayerTransaction(player, failure);
    }
  }

  for (const mutation of transaction.wallet ?? []) {
    const failure =
      mutation.kind === "credit"
        ? validateWalletCredit(wallet, mutation.amount)
        : validateWalletDebit(wallet, mutation.amount);

    if (failure !== undefined) {
      return failPlayerTransaction(player, failure);
    }

    wallet = mutation.kind === "credit" ? wallet + mutation.amount : wallet - mutation.amount;
  }

  return {
    ok: true,
    status: "success",
    player: {
      ...player,
      wallet,
      inventory
    }
  };
}

function applyInventoryAdd(
  inventory: Record<ItemId, number>,
  mutation: InventoryMutation,
  stackLimits: ItemStackLimitLookup
): PlayerTransactionFailure | undefined {
  const itemFailure = validateItemMutation(mutation);
  if (itemFailure !== undefined) {
    return itemFailure;
  }

  const stackLimit = stackLimits[mutation.itemId];
  if (stackLimit === undefined) {
    return createFailure("UNKNOWN_ITEM", `Unknown item id: ${mutation.itemId}.`, {
      itemId: mutation.itemId
    });
  }

  if (!isPositiveSafeInteger(stackLimit)) {
    return createFailure("INVALID_STACK_LIMIT", "Item stack limit must be a positive safe integer.", {
      itemId: mutation.itemId,
      stackLimit
    });
  }

  const current = inventory[mutation.itemId] ?? 0;
  const currentFailure = validateInventoryQuantity(mutation.itemId, current);
  if (currentFailure !== undefined) {
    return currentFailure;
  }

  if (current + mutation.quantity > stackLimit) {
    return createFailure("STACK_LIMIT_EXCEEDED", "Inventory mutation would exceed item stack limit.", {
      itemId: mutation.itemId,
      currentQuantity: current,
      addedQuantity: mutation.quantity,
      stackLimit
    });
  }

  inventory[mutation.itemId] = current + mutation.quantity;
  return undefined;
}

function applyInventoryRemove(
  inventory: Record<ItemId, number>,
  mutation: InventoryMutation
): PlayerTransactionFailure | undefined {
  const itemFailure = validateItemMutation(mutation);
  if (itemFailure !== undefined) {
    return itemFailure;
  }

  const current = inventory[mutation.itemId] ?? 0;
  const currentFailure = validateInventoryQuantity(mutation.itemId, current);
  if (currentFailure !== undefined) {
    return currentFailure;
  }

  if (current < mutation.quantity) {
    return createFailure("INSUFFICIENT_ITEM_QUANTITY", "Inventory does not contain enough items.", {
      itemId: mutation.itemId,
      currentQuantity: current,
      requiredQuantity: mutation.quantity
    });
  }

  const nextQuantity = current - mutation.quantity;
  if (nextQuantity === 0) {
    delete inventory[mutation.itemId];
  } else {
    inventory[mutation.itemId] = nextQuantity;
  }

  return undefined;
}

function validateItemMutation(mutation: ItemQuantityMutation): PlayerTransactionFailure | undefined {
  if (mutation.itemId.trim().length === 0) {
    return createFailure("INVALID_ITEM_ID", "Item id must be a non-empty string.", {});
  }

  if (!isPositiveSafeInteger(mutation.quantity)) {
    return createFailure("INVALID_ITEM_QUANTITY", "Item quantity must be a positive safe integer.", {
      itemId: mutation.itemId,
      quantity: mutation.quantity
    });
  }

  return undefined;
}

function validateInventoryQuantity(
  itemId: ItemId,
  quantity: number
): PlayerTransactionFailure | undefined {
  if (!isNonNegativeSafeInteger(quantity)) {
    return createFailure(
      "INVALID_INVENTORY_QUANTITY",
      "Inventory quantity must be a non-negative safe integer.",
      {
        itemId,
        quantity
      }
    );
  }

  return undefined;
}

function validateWalletBalance(wallet: number): PlayerTransactionFailure | undefined {
  if (!isNonNegativeSafeInteger(wallet)) {
    return createFailure("INVALID_WALLET_BALANCE", "Wallet balance must be a non-negative safe integer.", {
      wallet
    });
  }

  return undefined;
}

function validateWalletCredit(
  wallet: number,
  amount: number
): PlayerTransactionFailure | undefined {
  const amountFailure = validateCurrencyAmount(amount);
  if (amountFailure !== undefined) {
    return amountFailure;
  }

  if (wallet + amount > MAX_WALLET_BALANCE) {
    return createFailure("CURRENCY_OVERFLOW", "Wallet credit would exceed safe integer currency bounds.", {
      wallet,
      amount,
      maxWalletBalance: MAX_WALLET_BALANCE
    });
  }

  return undefined;
}

function validateWalletDebit(wallet: number, amount: number): PlayerTransactionFailure | undefined {
  const amountFailure = validateCurrencyAmount(amount);
  if (amountFailure !== undefined) {
    return amountFailure;
  }

  if (wallet < amount) {
    return createFailure("INSUFFICIENT_FUNDS", "Wallet does not contain enough currency.", {
      wallet,
      requiredAmount: amount
    });
  }

  return undefined;
}

function validateCurrencyAmount(amount: number): PlayerTransactionFailure | undefined {
  if (!isPositiveSafeInteger(amount)) {
    return createFailure("INVALID_CURRENCY_AMOUNT", "Currency amount must be a positive safe integer.", {
      amount
    });
  }

  return undefined;
}

function failPlayerTransaction(
  player: PlayerState,
  failure: PlayerTransactionFailure
): PlayerTransactionFailureResult {
  return {
    ok: false,
    status: "failure",
    player,
    failure,
    error: failure.message
  };
}

function createFailure(
  code: PlayerTransactionFailureCode,
  message: string,
  payload: JsonObject
): PlayerTransactionFailure {
  return {
    code,
    message,
    payload
  };
}

function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
