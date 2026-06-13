import { describe, expect, it } from "vitest";
import {
  applyCommand,
  createInitialState,
  type GameContentState,
  type GameState
} from "../src";

const dialogueContent: GameContentState = {
  itemStackLimits: {},
  recipes: [],
  residents: [{ id: "nia_moss" }],
  storyEvents: [
    {
      id: "arrival",
      triggerFlagIds: ["story_arrival_seen"],
      setsFlagIds: ["story_arrival_dialogue_seen"],
      dialogueLineIds: ["nia_story"]
    }
  ],
  dialogue: [
    {
      id: "nia_daily",
      speakerId: "nia_moss",
      category: "daily",
      text: {
        key: "dialogue.nia.daily",
        text: "Water early and the beds will forgive a busy afternoon."
      },
      priority: 10,
      cooldownDays: 1
    },
    {
      id: "nia_first_meet",
      speakerId: "nia_moss",
      category: "first_meet",
      text: {
        key: "dialogue.nia.first_meet",
        text: "You found the farm at a good time. The soil is awake."
      },
      priority: 80,
      cooldownDays: 0,
      setsFlagIds: ["met_nia_moss"]
    },
    {
      id: "nia_request_progress",
      speakerId: "nia_moss",
      category: "request_progress",
      text: {
        key: "dialogue.nia.request_progress",
        text: "That starter bed is the right place to begin."
      },
      conditions: {
        activeContractId: "starter_crop_help"
      },
      priority: 20,
      cooldownDays: 0
    },
    {
      id: "nia_milestone",
      speakerId: "nia_moss",
      category: "relationship_milestone",
      text: {
        key: "dialogue.nia.milestone",
        text: "You have the patience for a better seed shelf."
      },
      conditions: {
        minAffinity: 20
      },
      priority: 60,
      cooldownDays: 0,
      setsFlagIds: ["rel_nia_20_dialogue_seen"]
    },
    {
      id: "nia_story",
      speakerId: "nia_moss",
      category: "story_event",
      text: {
        key: "dialogue.nia.story",
        text: "Start with the field by your door. Small harvests count."
      },
      conditions: {
        requiredFlagIds: ["story_arrival_seen"]
      },
      priority: 100,
      cooldownDays: 0,
      setsFlagIds: ["story_arrival_dialogue_seen"]
    }
  ]
};

describe("NPC dialogue command", () => {
  it("selects authored first-meet dialogue and persists one-shot flags", () => {
    const state = createInitialState({ seed: "dialogue-first-meet" });
    const result = applyCommand(
      state,
      { type: "TALK_TO_NPC", npcId: "nia_moss" },
      { content: dialogueContent }
    );

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.events[0]?.type).toBe("NPC_DIALOGUE_SELECTED");
      expect(result.events[0]?.payload).toMatchObject({
        npcId: "nia_moss",
        lineId: "nia_first_meet",
        category: "first_meet"
      });
      expect(result.state.npcs.metNpcIds).toContain("nia_moss");
      expect(result.state.npcs.memoryFlags).toContain("met_nia_moss");
    }
  });

  it("prioritizes active request dialogue over daily fallback", () => {
    const state = withNpcMemory(createInitialState({ seed: "dialogue-request" }), [
      "met_nia_moss"
    ]);
    const activeRequestState: GameState = {
      ...state,
      contracts: {
        ...state.contracts,
        active: [
          {
            contractId: "starter_crop_help",
            requesterId: "nia_moss",
            status: "active",
            acceptedDay: 1,
            deadlineDay: 3,
            progress: 0
          }
        ]
      }
    };

    const result = applyCommand(
      activeRequestState,
      { type: "talkToNpc", npcId: "nia_moss" },
      { content: dialogueContent }
    );

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.events[0]?.payload).toMatchObject({
        lineId: "nia_request_progress",
        category: "request_progress"
      });
    }
  });

  it("does not repeat story or milestone dialogue after one-shot flags are set", () => {
    const storyState: GameState = {
      ...withNpcMemory(createInitialState({ seed: "dialogue-story" }), ["met_nia_moss"]),
      story: {
        completedEventIds: [],
        flags: ["story_arrival_seen"]
      }
    };
    const storyResult = applyCommand(
      storyState,
      { type: "TALK_TO_NPC", npcId: "nia_moss" },
      { content: dialogueContent }
    );

    expect(storyResult.ok).toBe(true);

    if (storyResult.ok) {
      expect(storyResult.events[0]?.payload).toMatchObject({
        lineId: "nia_story",
        category: "story_event"
      });

      const followUp = applyCommand(
        storyResult.state,
        { type: "TALK_TO_NPC", npcId: "nia_moss" },
        { content: dialogueContent }
      );

      expect(followUp.ok).toBe(true);
      if (followUp.ok) {
        expect(followUp.events[0]?.payload.lineId).not.toBe("nia_story");
      }
    }

    const milestoneState: GameState = {
      ...withNpcMemory(createInitialState({ seed: "dialogue-milestone" }), ["met_nia_moss"]),
      relationships: {
        affinity: [{ npcId: "nia_moss", affinity: 25 }],
        dailyGains: [],
        milestoneFlags: []
      }
    };
    const milestoneResult = applyCommand(
      milestoneState,
      { type: "TALK_TO_NPC", npcId: "nia_moss" },
      { content: dialogueContent }
    );

    expect(milestoneResult.ok).toBe(true);

    if (milestoneResult.ok) {
      expect(milestoneResult.events[0]?.payload).toMatchObject({
        lineId: "nia_milestone",
        category: "relationship_milestone"
      });

      const followUp = applyCommand(
        milestoneResult.state,
        { type: "TALK_TO_NPC", npcId: "nia_moss" },
        { content: dialogueContent }
      );

      expect(followUp.ok).toBe(true);
      if (followUp.ok) {
        expect(followUp.events[0]?.payload.lineId).not.toBe("nia_milestone");
      }
    }
  });

  it("enforces deterministic dialogue cooldowns by day", () => {
    const state = withNpcMemory(createInitialState({ seed: "dialogue-cooldown" }), [
      "met_nia_moss",
      "rel_nia_20_dialogue_seen"
    ]);
    const firstTalk = applyCommand(
      state,
      { type: "TALK_TO_NPC", npcId: "nia_moss" },
      { content: dialogueContent }
    );

    expect(firstTalk.ok).toBe(true);

    if (firstTalk.ok) {
      expect(firstTalk.events[0]?.payload.lineId).toBe("nia_daily");
      expect(firstTalk.state.npcs.dialogueCooldowns).toEqual([
        {
          lineId: "nia_daily",
          speakerId: "nia_moss",
          availableDay: 2
        }
      ]);

      const sameDay = applyCommand(
        firstTalk.state,
        { type: "TALK_TO_NPC", npcId: "nia_moss" },
        { content: dialogueContent }
      );

      expect(sameDay.ok).toBe(false);
      if (!sameDay.ok) {
        expect(sameDay.state).toBe(firstTalk.state);
        expect(sameDay.failure.code).toBe("NO_DIALOGUE_AVAILABLE");
      }

      const slept = applyCommand(firstTalk.state, { type: "SLEEP_TO_NEXT_DAY" });
      expect(slept.ok).toBe(true);

      if (slept.ok) {
        const nextDay = applyCommand(
          slept.state,
          { type: "TALK_TO_NPC", npcId: "nia_moss" },
          { content: dialogueContent }
        );
        expect(nextDay.ok).toBe(true);
        if (nextDay.ok) {
          expect(nextDay.events[0]?.payload.lineId).toBe("nia_daily");
        }
      }
    }
  });

  it("rejects unknown NPC dialogue transactionally", () => {
    const state = createInitialState({ seed: "dialogue-unknown" });
    const result = applyCommand(
      state,
      { type: "TALK_TO_NPC", npcId: "missing_resident" },
      { content: dialogueContent }
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);

    if (!result.ok) {
      expect(result.failure.code).toBe("UNKNOWN_NPC");
    }
  });
});

function withNpcMemory(state: GameState, memoryFlags: readonly string[]): GameState {
  return {
    ...state,
    npcs: {
      ...state.npcs,
      metNpcIds: ["nia_moss"],
      memoryFlags
    }
  };
}
