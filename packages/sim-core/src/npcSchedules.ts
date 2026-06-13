export const NPC_SCHEDULE_DAY_TYPES = {
  WEEKDAY: "weekday",
  WEEKEND: "weekend",
  RAIN: "rain",
  STORY: "story"
} as const;

export type NpcScheduleDayType = (typeof NPC_SCHEDULE_DAY_TYPES)[keyof typeof NPC_SCHEDULE_DAY_TYPES];
export type NpcBaseScheduleDayType = typeof NPC_SCHEDULE_DAY_TYPES.WEEKDAY | typeof NPC_SCHEDULE_DAY_TYPES.WEEKEND;
export type NpcScheduleWeather = "clear" | "rain";

export interface NpcScheduleEntryDefinition {
  readonly dayType: NpcScheduleDayType;
  readonly startHour: number;
  readonly endHour: number;
  readonly locationId: string;
  readonly requiredFlagIds?: readonly string[];
  readonly blockedFlagIds?: readonly string[];
}

export interface NpcScheduleDefinition {
  readonly id: string;
  readonly npcId: string;
  readonly entries: readonly NpcScheduleEntryDefinition[];
}

export interface NpcScheduleResolutionContext {
  readonly day: number;
  readonly hour: number;
  readonly weather?: NpcScheduleWeather;
  readonly activeFlagIds?: readonly string[];
}

export interface NpcScheduleResolution {
  readonly ok: true;
  readonly scheduleId: string;
  readonly npcId: string;
  readonly day: number;
  readonly hour: number;
  readonly dayType: NpcScheduleDayType;
  readonly locationId: string;
  readonly isOverride: boolean;
  readonly entry: NpcScheduleEntryDefinition;
}

export type NpcScheduleResolutionFailureCode =
  | "INVALID_DAY"
  | "INVALID_HOUR"
  | "NO_MATCHING_ENTRY"
  | "AMBIGUOUS_MATCHING_ENTRIES";

export interface NpcScheduleResolutionFailure {
  readonly ok: false;
  readonly scheduleId: string;
  readonly npcId: string;
  readonly failure: {
    readonly code: NpcScheduleResolutionFailureCode;
    readonly message: string;
  };
}

export type NpcScheduleResolutionResult = NpcScheduleResolution | NpcScheduleResolutionFailure;

export interface NpcShopScheduleDefinition {
  readonly id: string;
  readonly ownerNpcId: string;
  readonly locationId: string;
}

export interface NpcShopAvailability {
  readonly ok: true;
  readonly shopId: string;
  readonly ownerNpcId: string;
  readonly isOpen: boolean;
  readonly ownerLocationId: string;
  readonly shopLocationId: string;
  readonly schedule: NpcScheduleResolution;
}

export interface NpcShopAvailabilityFailure {
  readonly ok: false;
  readonly shopId: string;
  readonly ownerNpcId: string;
  readonly failure: {
    readonly code: "SHOP_OWNER_MISMATCH" | "SCHEDULE_UNRESOLVED";
    readonly message: string;
  };
}

export type NpcShopAvailabilityResult = NpcShopAvailability | NpcShopAvailabilityFailure;

export interface NpcScheduleCoverageOptions {
  readonly requiredDayTypes?: readonly NpcBaseScheduleDayType[];
  readonly validLocationIds?: ReadonlySet<string> | readonly string[];
}

export interface NpcScheduleCoverageIssue {
  readonly scheduleId: string;
  readonly npcId: string;
  readonly code:
    | "INVALID_DAY_TYPE"
    | "INVALID_HOUR_RANGE"
    | "UNKNOWN_LOCATION"
    | "MISSING_COVERAGE"
    | "OVERLAPPING_COVERAGE";
  readonly message: string;
  readonly dayType?: NpcScheduleDayType;
  readonly hour?: number;
}

const DEFAULT_REQUIRED_COVERAGE_DAY_TYPES: readonly NpcBaseScheduleDayType[] = [
  NPC_SCHEDULE_DAY_TYPES.WEEKDAY,
  NPC_SCHEDULE_DAY_TYPES.WEEKEND
];

export function isNpcWeekendDay(day: number): boolean {
  const dayOfWeek = ((day - 1) % 7) + 1;

  return dayOfWeek === 6 || dayOfWeek === 7;
}

export function getNpcScheduleBaseDayType(day: number): NpcBaseScheduleDayType {
  return isNpcWeekendDay(day) ? NPC_SCHEDULE_DAY_TYPES.WEEKEND : NPC_SCHEDULE_DAY_TYPES.WEEKDAY;
}

export function resolveNpcSchedule(
  schedule: NpcScheduleDefinition,
  context: NpcScheduleResolutionContext
): NpcScheduleResolutionResult {
  if (!Number.isInteger(context.day) || context.day < 1) {
    return createScheduleFailure(schedule, "INVALID_DAY", `Schedule day must be a positive integer: ${context.day}.`);
  }

  if (!Number.isInteger(context.hour) || context.hour < 0 || context.hour > 23) {
    return createScheduleFailure(schedule, "INVALID_HOUR", `Schedule hour must be an integer from 0 to 23: ${context.hour}.`);
  }

  const activeFlags = new Set(context.activeFlagIds ?? []);

  for (const dayType of getScheduleResolutionPriority(context)) {
    const matches = schedule.entries.filter(
      (entry) => entry.dayType === dayType && coversHour(entry, context.hour) && entryConditionsPass(entry, activeFlags)
    );

    if (matches.length === 0) {
      continue;
    }

    if (matches.length > 1) {
      return createScheduleFailure(
        schedule,
        "AMBIGUOUS_MATCHING_ENTRIES",
        `Schedule ${schedule.id} has ${matches.length} ${dayType} entries for hour ${context.hour}.`
      );
    }

    const entry = matches[0];
    if (entry === undefined) {
      continue;
    }

    return {
      ok: true,
      scheduleId: schedule.id,
      npcId: schedule.npcId,
      day: context.day,
      hour: context.hour,
      dayType,
      locationId: entry.locationId,
      isOverride: dayType === NPC_SCHEDULE_DAY_TYPES.RAIN || dayType === NPC_SCHEDULE_DAY_TYPES.STORY,
      entry
    };
  }

  return createScheduleFailure(
    schedule,
    "NO_MATCHING_ENTRY",
    `Schedule ${schedule.id} has no matching entry for day ${context.day} hour ${context.hour}.`
  );
}

export function resolveNpcShopAvailability(
  schedule: NpcScheduleDefinition,
  shop: NpcShopScheduleDefinition,
  context: NpcScheduleResolutionContext
): NpcShopAvailabilityResult {
  if (shop.ownerNpcId !== schedule.npcId) {
    return {
      ok: false,
      shopId: shop.id,
      ownerNpcId: shop.ownerNpcId,
      failure: {
        code: "SHOP_OWNER_MISMATCH",
        message: `Shop ${shop.id} is owned by ${shop.ownerNpcId}, not schedule NPC ${schedule.npcId}.`
      }
    };
  }

  const resolved = resolveNpcSchedule(schedule, context);
  if (!resolved.ok) {
    return {
      ok: false,
      shopId: shop.id,
      ownerNpcId: shop.ownerNpcId,
      failure: {
        code: "SCHEDULE_UNRESOLVED",
        message: resolved.failure.message
      }
    };
  }

  return {
    ok: true,
    shopId: shop.id,
    ownerNpcId: shop.ownerNpcId,
    isOpen: resolved.locationId === shop.locationId,
    ownerLocationId: resolved.locationId,
    shopLocationId: shop.locationId,
    schedule: resolved
  };
}

export function validateNpcScheduleCoverage(
  schedules: readonly NpcScheduleDefinition[],
  options: NpcScheduleCoverageOptions = {}
): readonly NpcScheduleCoverageIssue[] {
  const issues: NpcScheduleCoverageIssue[] = [];
  const requiredDayTypes = options.requiredDayTypes ?? DEFAULT_REQUIRED_COVERAGE_DAY_TYPES;
  const validLocationIds = normalizeLocationIds(options.validLocationIds);

  for (const schedule of schedules) {
    const coverageByDayType = new Map<NpcBaseScheduleDayType, number[]>();

    for (const entry of schedule.entries) {
      if (!isKnownScheduleDayType(entry.dayType)) {
        issues.push({
          scheduleId: schedule.id,
          npcId: schedule.npcId,
          code: "INVALID_DAY_TYPE",
          message: `Schedule ${schedule.id} has invalid dayType: ${String(entry.dayType)}.`
        });
        continue;
      }

      if (validLocationIds !== undefined && !validLocationIds.has(entry.locationId)) {
        issues.push({
          scheduleId: schedule.id,
          npcId: schedule.npcId,
          code: "UNKNOWN_LOCATION",
          dayType: entry.dayType,
          message: `Schedule ${schedule.id} references unknown location: ${entry.locationId}.`
        });
      }

      if (!isValidHourRange(entry)) {
        issues.push({
          scheduleId: schedule.id,
          npcId: schedule.npcId,
          code: "INVALID_HOUR_RANGE",
          dayType: entry.dayType,
          message: `Schedule ${schedule.id} ${entry.dayType} entry must use 0 <= startHour < endHour <= 24.`
        });
        continue;
      }

      if (entry.dayType !== NPC_SCHEDULE_DAY_TYPES.WEEKDAY && entry.dayType !== NPC_SCHEDULE_DAY_TYPES.WEEKEND) {
        continue;
      }

      const coverage = coverageByDayType.get(entry.dayType) ?? Array.from({ length: 24 }, () => 0);
      for (let hour = entry.startHour; hour < entry.endHour; hour += 1) {
        coverage[hour] = (coverage[hour] ?? 0) + 1;
      }
      coverageByDayType.set(entry.dayType, coverage);
    }

    for (const dayType of requiredDayTypes) {
      const coverage = coverageByDayType.get(dayType);
      if (coverage === undefined) {
        issues.push({
          scheduleId: schedule.id,
          npcId: schedule.npcId,
          code: "MISSING_COVERAGE",
          dayType,
          message: `Schedule ${schedule.id} must include ${dayType} coverage for every hour.`
        });
        continue;
      }

      for (let hour = 0; hour < 24; hour += 1) {
        const count = coverage[hour] ?? 0;
        if (count === 0) {
          issues.push({
            scheduleId: schedule.id,
            npcId: schedule.npcId,
            code: "MISSING_COVERAGE",
            dayType,
            hour,
            message: `Schedule ${schedule.id} ${dayType} hour ${hour} has no location.`
          });
          continue;
        }

        if (count > 1) {
          issues.push({
            scheduleId: schedule.id,
            npcId: schedule.npcId,
            code: "OVERLAPPING_COVERAGE",
            dayType,
            hour,
            message: `Schedule ${schedule.id} ${dayType} hour ${hour} resolves to ${count} locations.`
          });
        }
      }
    }
  }

  return issues;
}

function getScheduleResolutionPriority(context: NpcScheduleResolutionContext): readonly NpcScheduleDayType[] {
  const baseDayType = getNpcScheduleBaseDayType(context.day);

  if (context.weather === "rain") {
    return [NPC_SCHEDULE_DAY_TYPES.STORY, NPC_SCHEDULE_DAY_TYPES.RAIN, baseDayType];
  }

  return [NPC_SCHEDULE_DAY_TYPES.STORY, baseDayType];
}

function coversHour(entry: NpcScheduleEntryDefinition, hour: number): boolean {
  return isValidHourRange(entry) && hour >= entry.startHour && hour < entry.endHour;
}

function entryConditionsPass(entry: NpcScheduleEntryDefinition, activeFlags: ReadonlySet<string>): boolean {
  for (const flagId of entry.requiredFlagIds ?? []) {
    if (!activeFlags.has(flagId)) {
      return false;
    }
  }

  for (const flagId of entry.blockedFlagIds ?? []) {
    if (activeFlags.has(flagId)) {
      return false;
    }
  }

  return true;
}

function isValidHourRange(entry: NpcScheduleEntryDefinition): boolean {
  return (
    Number.isInteger(entry.startHour) &&
    Number.isInteger(entry.endHour) &&
    entry.startHour >= 0 &&
    entry.endHour <= 24 &&
    entry.startHour < entry.endHour
  );
}

function isKnownScheduleDayType(value: string): value is NpcScheduleDayType {
  return (
    value === NPC_SCHEDULE_DAY_TYPES.WEEKDAY ||
    value === NPC_SCHEDULE_DAY_TYPES.WEEKEND ||
    value === NPC_SCHEDULE_DAY_TYPES.RAIN ||
    value === NPC_SCHEDULE_DAY_TYPES.STORY
  );
}

function normalizeLocationIds(
  locationIds: ReadonlySet<string> | readonly string[] | undefined
): ReadonlySet<string> | undefined {
  if (locationIds === undefined) {
    return undefined;
  }

  if (typeof (locationIds as ReadonlySet<string>).has === "function") {
    return locationIds as ReadonlySet<string>;
  }

  return new Set(locationIds as readonly string[]);
}

function createScheduleFailure(
  schedule: NpcScheduleDefinition,
  code: NpcScheduleResolutionFailureCode,
  message: string
): NpcScheduleResolutionFailure {
  return {
    ok: false,
    scheduleId: schedule.id,
    npcId: schedule.npcId,
    failure: {
      code,
      message
    }
  };
}
