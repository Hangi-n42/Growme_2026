import { describe, expect, it } from "vitest";
import {
  SAVE_SCHEMA_VERSION,
  SaveValidationError,
  createInitialState,
  createSaveSnapshot,
  deserializeState,
  serializeState,
  tryDeserializeState,
  validateSaveSnapshot,
  type GameSaveSnapshot,
  type GameState
} from "../src";

function createRoundtripState(): GameState {
  const state = createInitialState({
    seed: "save-roundtrip",
    contentVersion: "v0.1-save-test"
  });

  return {
    ...state,
    player: {
      ...state.player,
      energy: 72,
      wallet: 325,
      inventory: {
        turnip_seed: 4,
        fieldstone: 6
      }
    },
    mine: {
      deepestFloorReached: 3,
      daily: {
        day: state.day,
        floor: 2,
        depletedNodeIds: ["mine-2-rock-1"],
        exitRevealed: true
      }
    },
    shops: {
      shops: [
        {
          shopId: "seed-shop",
          stock: {
            turnip_seed: 12
          },
          budget: 180,
          nextRestockDay: 2
        }
      ]
    },
    contracts: {
      active: [
        {
          contractId: "nia-first-turnip",
          requesterId: "nia_moss",
          status: "active",
          acceptedDay: 1,
          deadlineDay: 3,
          progress: 1
        }
      ],
      completedIds: ["arrival-help"],
      cooldowns: [
        {
          contractId: "fieldstone-order",
          availableDay: 4
        }
      ]
    },
    npcs: {
      metNpcIds: ["nia_moss", "oren_clay"],
      memoryFlags: ["met_nia_moss"]
    },
    relationships: {
      affinity: [
        {
          npcId: "nia_moss",
          affinity: 25
        }
      ],
      dailyGains: [
        {
          npcId: "nia_moss",
          day: 1,
          amount: 5
        }
      ],
      milestoneFlags: ["nia_moss_20"]
    },
    story: {
      completedEventIds: ["arrival"],
      flags: ["arrival_seen"]
    },
    decor: {
      placements: [
        {
          placementId: "home-crate-1",
          itemId: "simple_crate",
          areaId: "home",
          x: 1,
          y: 2,
          rotation: 90
        }
      ]
    },
    flags: ["tutorial_started"]
  };
}

describe("save snapshots and migrations", () => {
  it("serializes a deterministic v1 envelope and roundtrips all persisted slices", () => {
    const state = createRoundtripState();
    const serialized = serializeState(state);
    const parsed = JSON.parse(serialized) as GameSaveSnapshot;

    expect(parsed.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(parsed.contentVersion).toBe("v0.1-save-test");
    expect(parsed.commandLogPointer).toBe(state.commandLog.nextSequence);
    expect(parsed.state.mine).toEqual(state.mine);
    expect(parsed.state.shops).toEqual(state.shops);
    expect(parsed.state.contracts).toEqual(state.contracts);
    expect(parsed.state.npcs).toEqual(state.npcs);
    expect(parsed.state.relationships).toEqual(state.relationships);
    expect(parsed.state.story).toEqual(state.story);
    expect(parsed.state.decor).toEqual(state.decor);

    const loaded = tryDeserializeState(serialized, {
      expectedContentVersion: "v0.1-save-test"
    });

    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.migrated).toBe(false);
      expect(loaded.state).toEqual(state);
    }

    expect(deserializeState(serialized)).toEqual(state);
  });

  it("returns a validation result for corrupted or incompatible saves", () => {
    const corrupted = tryDeserializeState("{not-json");

    expect(corrupted.ok).toBe(false);
    if (!corrupted.ok) {
      expect(corrupted.error).toBe("Save data is not valid JSON.");
      expect(corrupted.issues[0]?.path).toBe("save");
    }

    expect(() => deserializeState("{not-json")).toThrow(SaveValidationError);

    const state = createRoundtripState();
    const mismatch = tryDeserializeState(serializeState(state), {
      expectedContentVersion: "different-content"
    });

    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) {
      expect(mismatch.issues.some((issue) => issue.path === "save.contentVersion")).toBe(true);
    }
  });

  it("validates persisted economy and relationship values before loading", () => {
    const state = createRoundtripState();
    const invalidSnapshot = createSaveSnapshot({
      ...state,
      player: {
        ...state.player,
        wallet: -1
      },
      relationships: {
        ...state.relationships,
        affinity: [
          {
            npcId: "nia_moss",
            affinity: 101
          }
        ]
      }
    });

    const validation = validateSaveSnapshot(invalidSnapshot);

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.issues.map((issue) => issue.path)).toEqual(
        expect.arrayContaining([
          "save.state.player.wallet",
          "save.state.relationships.affinity[0].affinity"
        ])
      );
    }
  });

  it("migrates legacy raw GameState saves into the v1 envelope", () => {
    const state = createInitialState({ seed: "legacy-save" });
    const {
      mine: _mine,
      shops: _shops,
      contracts: _contracts,
      npcs: _npcs,
      relationships: _relationships,
      story: _story,
      decor: _decor,
      ...legacyState
    } = state;
    const loaded = tryDeserializeState(JSON.stringify(legacyState));

    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.migrated).toBe(true);
      expect(loaded.snapshot.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
      expect(loaded.state.mine).toEqual(state.mine);
      expect(loaded.state.shops).toEqual(state.shops);
      expect(loaded.state.contracts).toEqual(state.contracts);
      expect(loaded.state.npcs).toEqual(state.npcs);
      expect(loaded.state.relationships).toEqual(state.relationships);
      expect(loaded.state.story).toEqual(state.story);
      expect(loaded.state.decor).toEqual(state.decor);
    }
  });
});
