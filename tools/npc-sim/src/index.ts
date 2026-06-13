import {
  resolveNpcSchedule,
  resolveNpcShopAvailability,
  validateNpcScheduleCoverage,
  type NpcScheduleCoverageIssue,
  type NpcScheduleDefinition,
  type NpcScheduleWeather,
  type NpcShopScheduleDefinition
} from "@growme/sim-core";

export interface NpcScheduleProbe {
  readonly residentId: string;
  readonly checkedHours: number;
  readonly unresolvedLocations: number;
  readonly coverageIssueCount: number;
  readonly shopOpenHours: readonly number[];
}

export interface CreateNpcScheduleProbeOptions {
  readonly schedule?: NpcScheduleDefinition;
  readonly validLocationIds?: readonly string[];
  readonly shop?: NpcShopScheduleDefinition;
  readonly weather?: NpcScheduleWeather;
  readonly activeFlagIds?: readonly string[];
}

export function createNpcScheduleProbe(
  residentId: string,
  options: CreateNpcScheduleProbeOptions = {}
): NpcScheduleProbe {
  if (options.schedule === undefined) {
    return {
      residentId,
      checkedHours: 24,
      unresolvedLocations: 0,
      coverageIssueCount: 0,
      shopOpenHours: []
    };
  }

  const coverageOptions =
    options.validLocationIds === undefined
      ? {}
      : {
          validLocationIds: options.validLocationIds
        };
  const coverageIssues = validateNpcScheduleCoverage([options.schedule], coverageOptions);
  const shopOpenHours =
    options.shop === undefined
      ? []
      : collectShopOpenHours(options.schedule, options.shop, options.weather, options.activeFlagIds);

  return {
    residentId: options.schedule.npcId,
    checkedHours: 48,
    unresolvedLocations: countUnresolvedLocationIssues(coverageIssues),
    coverageIssueCount: coverageIssues.length,
    shopOpenHours
  };
}

function collectShopOpenHours(
  schedule: NpcScheduleDefinition,
  shop: NpcShopScheduleDefinition,
  weather: NpcScheduleWeather | undefined,
  activeFlagIds: readonly string[] | undefined
): readonly number[] {
  const openHours: number[] = [];

  for (let hour = 0; hour < 24; hour += 1) {
    const context = {
      day: 1,
      hour,
      ...(weather === undefined ? {} : { weather }),
      ...(activeFlagIds === undefined ? {} : { activeFlagIds })
    };
    const result = resolveNpcShopAvailability(schedule, shop, context);

    if (result.ok && result.isOpen) {
      openHours.push(hour);
    }
  }

  return openHours;
}

function countUnresolvedLocationIssues(issues: readonly NpcScheduleCoverageIssue[]): number {
  return issues.filter(
    (issue) =>
      issue.code === "UNKNOWN_LOCATION" ||
      issue.code === "MISSING_COVERAGE" ||
      issue.code === "OVERLAPPING_COVERAGE"
  ).length;
}

export { resolveNpcSchedule, resolveNpcShopAvailability, validateNpcScheduleCoverage };
export type { NpcScheduleCoverageIssue, NpcScheduleDefinition, NpcScheduleWeather, NpcShopScheduleDefinition };
