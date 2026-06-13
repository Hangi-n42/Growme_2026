import { describe, expect, it } from "vitest";
import {
  getNpcScheduleBaseDayType,
  resolveNpcSchedule,
  resolveNpcShopAvailability,
  validateNpcScheduleCoverage,
  type NpcScheduleDefinition
} from "../src";

const niaSchedule: NpcScheduleDefinition = {
  id: "nia_moss_schedule",
  npcId: "nia_moss",
  entries: [
    { dayType: "weekday", startHour: 0, endHour: 8, locationId: "nia_home" },
    { dayType: "weekday", startHour: 8, endHour: 17, locationId: "seed_shop" },
    { dayType: "weekday", startHour: 17, endHour: 24, locationId: "nia_home" },
    { dayType: "weekend", startHour: 0, endHour: 9, locationId: "nia_home" },
    { dayType: "weekend", startHour: 9, endHour: 14, locationId: "village_square" },
    { dayType: "weekend", startHour: 14, endHour: 18, locationId: "seed_shop" },
    { dayType: "weekend", startHour: 18, endHour: 24, locationId: "nia_home" },
    { dayType: "rain", startHour: 8, endHour: 12, locationId: "seed_shop" },
    {
      dayType: "story",
      startHour: 8,
      endHour: 12,
      locationId: "old_path",
      requiredFlagIds: ["story_path_restored"],
      blockedFlagIds: ["story_path_archived"]
    }
  ]
};

describe("NPC schedule resolution", () => {
  it("resolves weekday and weekend locations from deterministic day numbers", () => {
    expect(getNpcScheduleBaseDayType(1)).toBe("weekday");
    expect(getNpcScheduleBaseDayType(6)).toBe("weekend");

    const weekday = resolveNpcSchedule(niaSchedule, {
      day: 1,
      hour: 10
    });
    const weekend = resolveNpcSchedule(niaSchedule, {
      day: 6,
      hour: 10
    });

    expect(weekday.ok).toBe(true);
    expect(weekend.ok).toBe(true);

    if (weekday.ok && weekend.ok) {
      expect(weekday.dayType).toBe("weekday");
      expect(weekday.locationId).toBe("seed_shop");
      expect(weekday.isOverride).toBe(false);
      expect(weekend.dayType).toBe("weekend");
      expect(weekend.locationId).toBe("village_square");
    }
  });

  it("prioritizes story overrides over rain and base schedules", () => {
    const story = resolveNpcSchedule(niaSchedule, {
      day: 1,
      hour: 10,
      weather: "rain",
      activeFlagIds: ["story_path_restored"]
    });
    const rain = resolveNpcSchedule(niaSchedule, {
      day: 1,
      hour: 10,
      weather: "rain"
    });
    const blockedStory = resolveNpcSchedule(niaSchedule, {
      day: 1,
      hour: 10,
      weather: "rain",
      activeFlagIds: ["story_path_restored", "story_path_archived"]
    });

    expect(story.ok).toBe(true);
    expect(rain.ok).toBe(true);
    expect(blockedStory.ok).toBe(true);

    if (story.ok && rain.ok && blockedStory.ok) {
      expect(story.dayType).toBe("story");
      expect(story.locationId).toBe("old_path");
      expect(story.isOverride).toBe(true);
      expect(rain.dayType).toBe("rain");
      expect(rain.locationId).toBe("seed_shop");
      expect(blockedStory.dayType).toBe("rain");
    }
  });

  it("connects shop availability to the resolved owner location", () => {
    const open = resolveNpcShopAvailability(
      niaSchedule,
      {
        id: "nia_seed_stall",
        ownerNpcId: "nia_moss",
        locationId: "seed_shop"
      },
      {
        day: 1,
        hour: 10
      }
    );
    const closed = resolveNpcShopAvailability(
      niaSchedule,
      {
        id: "nia_seed_stall",
        ownerNpcId: "nia_moss",
        locationId: "seed_shop"
      },
      {
        day: 6,
        hour: 10
      }
    );

    expect(open.ok).toBe(true);
    expect(closed.ok).toBe(true);

    if (open.ok && closed.ok) {
      expect(open.isOpen).toBe(true);
      expect(open.ownerLocationId).toBe("seed_shop");
      expect(closed.isOpen).toBe(false);
      expect(closed.ownerLocationId).toBe("village_square");
    }
  });

  it("reports invalid coverage instead of inventing a fallback location", () => {
    const issues = validateNpcScheduleCoverage(
      [
        {
          id: "broken_schedule",
          npcId: "broken_npc",
          entries: [
            { dayType: "weekday", startHour: 0, endHour: 12, locationId: "home" },
            { dayType: "weekday", startHour: 12, endHour: 24, locationId: "missing_location" },
            { dayType: "weekend", startHour: 0, endHour: 25, locationId: "home" }
          ]
        }
      ],
      {
        validLocationIds: ["home"]
      }
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNKNOWN_LOCATION",
          message: "Schedule broken_schedule references unknown location: missing_location."
        }),
        expect.objectContaining({
          code: "INVALID_HOUR_RANGE",
          dayType: "weekend"
        }),
        expect.objectContaining({
          code: "MISSING_COVERAGE",
          dayType: "weekend"
        })
      ])
    );
  });
});
