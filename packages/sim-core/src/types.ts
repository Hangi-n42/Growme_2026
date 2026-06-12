export type ItemId = string;
export type NpcId = string;

export interface Inventory {
  readonly [itemId: ItemId]: number;
}

export interface SimPlayerState {
  readonly energy: number;
  readonly wallet: number;
  readonly inventory: Inventory;
}

export interface SimEvent {
  readonly type: string;
  readonly message: string;
  readonly data?: Record<string, unknown>;
}

export interface SimState {
  readonly version: 1;
  readonly seed: string;
  readonly day: number;
  readonly minute: number;
  readonly player: SimPlayerState;
  readonly flags: readonly string[];
  readonly eventLog: readonly SimEvent[];
}

export type SimCommand =
  | {
      readonly type: "advanceTime";
      readonly minutes: number;
    }
  | {
      readonly type: "debugAddItem";
      readonly itemId: ItemId;
      readonly quantity: number;
    }
  | {
      readonly type: "saveSnapshot";
    };

export interface SimResult {
  readonly ok: boolean;
  readonly state: SimState;
  readonly events: readonly SimEvent[];
  readonly error?: string;
}
