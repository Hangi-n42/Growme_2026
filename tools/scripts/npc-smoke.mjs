import { readJson, runCheck } from "./lib/repo.mjs";

const placeholderNamePattern = /\b(?:todo|tbd|placeholder|npc\s*\d*)\b/iu;
const storyRoles = new Set(["primary", "supporting"]);

runCheck("v0.1 NPC profiles are authored, linked, and meet scaffold minimum", () => {
  const manifest = readJson("packages/content-schema/content/npcs.seed.json");
  const collections = {
    flags: collectById(manifest.flags),
    locations: collectById(manifest.locations),
    schedules: collectById(manifest.schedules),
    items: collectById(manifest.items),
    contracts: collectById(manifest.contracts),
    relationshipMilestones: collectById(manifest.relationshipMilestones),
    shops: collectById(manifest.shops),
    storyEvents: collectById(manifest.storyEvents)
  };

  if (!Array.isArray(manifest.residents) || manifest.residents.length < 5) {
    throw new Error("At least 5 NPC residents are required for v0.1.");
  }

  const residentIds = new Set();
  const residentNames = new Set();

  for (const resident of manifest.residents) {
    const residentId = requireNonEmptyString(resident.id, "resident.id");
    if (residentIds.has(residentId)) {
      throw new Error(`Duplicate resident id: ${residentId}.`);
    }
    residentIds.add(residentId);

    validateLocalizedText(resident.displayName, `resident ${residentId}.displayName`);
    validateLocalizedText(resident.job, `resident ${residentId}.job`);
    if (placeholderNamePattern.test(resident.displayName.text)) {
      throw new Error(`resident ${residentId}.displayName.text contains placeholder player-facing text.`);
    }
    if (residentNames.has(resident.displayName.text)) {
      throw new Error(`Duplicate resident display name: ${resident.displayName.text}.`);
    }
    residentNames.add(resident.displayName.text);

    requireReference(resident.homeLocationId, collections.locations, `resident ${residentId}.homeLocationId`);
    const schedule = requireReference(resident.scheduleId, collections.schedules, `resident ${residentId}.scheduleId`);
    if (schedule.npcId !== residentId) {
      throw new Error(`resident ${residentId}.scheduleId references schedule ${resident.scheduleId} owned by ${schedule.npcId}.`);
    }
    validatePreferenceProfile(resident.preferenceProfile, residentId, collections);
    validateOwnedContracts(resident.requestHookIds, residentId, collections);
    validateOwnedMilestones(resident.relationshipHookIds, residentId, collections);
    validateMemoryFlags(resident.memoryFlagIds, residentId, collections);
    validateOwnedShops(resident.shopIds, residentId, collections);
    validateScheduleCoverage(schedule, collections);
    validateShopScheduleAvailability(resident, schedule, collections);
    validateStoryParticipation(resident.storyParticipation, residentId, collections);
  }
});

function validatePreferenceProfile(profile, residentId, collections) {
  if (!isRecord(profile)) {
    throw new Error(`resident ${residentId}.preferenceProfile must be an object.`);
  }

  const likedTags = requireStringArray(profile.likedTags, `resident ${residentId}.preferenceProfile.likedTags`);
  const dislikedTags = requireStringArray(profile.dislikedTags, `resident ${residentId}.preferenceProfile.dislikedTags`);
  const giftItemIds = requireStringArray(profile.giftItemIds, `resident ${residentId}.preferenceProfile.giftItemIds`);

  rejectDuplicates(likedTags, `resident ${residentId}.preferenceProfile.likedTags`);
  rejectDuplicates(dislikedTags, `resident ${residentId}.preferenceProfile.dislikedTags`);
  rejectDuplicates(giftItemIds, `resident ${residentId}.preferenceProfile.giftItemIds`);

  const likedTagSet = new Set(likedTags);
  for (const tag of dislikedTags) {
    if (likedTagSet.has(tag)) {
      throw new Error(`resident ${residentId}.preferenceProfile cannot like and dislike tag: ${tag}.`);
    }
  }

  for (const itemId of giftItemIds) {
    requireReference(itemId, collections.items, `resident ${residentId}.preferenceProfile.giftItemIds`);
  }
}

function validateOwnedContracts(contractIds, residentId, collections) {
  for (const contractId of requireStringArray(contractIds, `resident ${residentId}.requestHookIds`)) {
    const contract = requireReference(contractId, collections.contracts, `resident ${residentId}.requestHookIds`);
    if (contract.requesterNpcId !== residentId) {
      throw new Error(`resident ${residentId}.requestHookIds references contract ${contractId} owned by ${contract.requesterNpcId}.`);
    }
  }
}

function validateOwnedMilestones(milestoneIds, residentId, collections) {
  for (const milestoneId of requireStringArray(milestoneIds, `resident ${residentId}.relationshipHookIds`)) {
    const milestone = requireReference(
      milestoneId,
      collections.relationshipMilestones,
      `resident ${residentId}.relationshipHookIds`
    );
    if (milestone.npcId !== residentId) {
      throw new Error(`resident ${residentId}.relationshipHookIds references milestone ${milestoneId} owned by ${milestone.npcId}.`);
    }
  }
}

function validateMemoryFlags(flagIds, residentId, collections) {
  for (const flagId of requireStringArray(flagIds, `resident ${residentId}.memoryFlagIds`)) {
    requireReference(flagId, collections.flags, `resident ${residentId}.memoryFlagIds`);
  }
}

function validateOwnedShops(shopIds, residentId, collections) {
  for (const shopId of requireStringArray(shopIds, `resident ${residentId}.shopIds`, { allowEmpty: true })) {
    const shop = requireReference(shopId, collections.shops, `resident ${residentId}.shopIds`);
    if (shop.ownerNpcId !== residentId) {
      throw new Error(`resident ${residentId}.shopIds references shop ${shopId} owned by ${shop.ownerNpcId}.`);
    }
  }
}

function validateScheduleCoverage(schedule, collections) {
  if (!Array.isArray(schedule.entries) || schedule.entries.length === 0) {
    throw new Error(`schedule ${schedule.id}.entries must be a non-empty array.`);
  }

  const coverageByDayType = new Map();
  for (const [index, entry] of schedule.entries.entries()) {
    const path = `schedule ${schedule.id}.entries[${index}]`;
    if (!isRecord(entry)) {
      throw new Error(`${path} must be an object.`);
    }

    if (!["weekday", "weekend", "rain", "story"].includes(entry.dayType)) {
      throw new Error(`${path}.dayType must be one of weekday, weekend, rain, story.`);
    }

    requireHourRange(entry, path);
    requireReference(entry.locationId, collections.locations, `${path}.locationId`);
    validateLocalizedText(entry.activity, `${path}.activity`);

    if (entry.dayType !== "weekday" && entry.dayType !== "weekend") {
      continue;
    }

    const coverage = coverageByDayType.get(entry.dayType) ?? Array.from({ length: 24 }, () => 0);
    for (let hour = entry.startHour; hour < entry.endHour; hour += 1) {
      coverage[hour] += 1;
    }
    coverageByDayType.set(entry.dayType, coverage);
  }

  for (const dayType of ["weekday", "weekend"]) {
    const coverage = coverageByDayType.get(dayType);
    if (!coverage) {
      throw new Error(`schedule ${schedule.id} must include ${dayType} coverage for every hour.`);
    }

    for (let hour = 0; hour < 24; hour += 1) {
      if (coverage[hour] !== 1) {
        throw new Error(`schedule ${schedule.id} ${dayType} hour ${hour} must resolve to exactly one location.`);
      }
    }
  }
}

function validateShopScheduleAvailability(resident, schedule, collections) {
  for (const shopId of resident.shopIds) {
    const shop = requireReference(shopId, collections.shops, `resident ${resident.id}.shopIds`);
    const shopEntries = schedule.entries.filter((entry) => entry.locationId === shop.locationId);

    if (shopEntries.length === 0) {
      throw new Error(`resident ${resident.id} schedule ${schedule.id} never visits shop ${shopId} at ${shop.locationId}.`);
    }
  }
}

function validateStoryParticipation(participation, residentId, collections) {
  const records = requireRecordArray(participation, `resident ${residentId}.storyParticipation`);
  const storyEventIds = new Set();

  for (const [index, entry] of records.entries()) {
    const path = `resident ${residentId}.storyParticipation[${index}]`;
    const storyEventId = requireNonEmptyString(entry.storyEventId, `${path}.storyEventId`);
    if (typeof entry.role !== "string" || !storyRoles.has(entry.role)) {
      throw new Error(`${path}.role must be one of primary, supporting.`);
    }
    if (storyEventIds.has(storyEventId)) {
      throw new Error(`resident ${residentId}.storyParticipation contains duplicate story event: ${storyEventId}.`);
    }
    storyEventIds.add(storyEventId);

    const storyEvent = requireReference(storyEventId, collections.storyEvents, `${path}.storyEventId`);
    if (!Array.isArray(storyEvent.participantNpcIds) || !storyEvent.participantNpcIds.includes(residentId)) {
      throw new Error(`${path}.storyEventId references story event ${storyEventId} without participant ${residentId}.`);
    }
  }
}

function collectById(values) {
  const ids = new Map();
  if (!Array.isArray(values)) {
    return ids;
  }

  for (const value of values) {
    if (isRecord(value) && typeof value.id === "string") {
      ids.set(value.id, value);
    }
  }

  return ids;
}

function validateLocalizedText(value, path) {
  if (!isRecord(value)) {
    throw new Error(`${path} must be a localized text object.`);
  }

  requireNonEmptyString(value.key, `${path}.key`);
  requireNonEmptyString(value.text, `${path}.text`);
}

function requireReference(id, validIds, path) {
  const referenceId = requireNonEmptyString(id, path);
  const value = validIds.get(referenceId);
  if (value === undefined) {
    throw new Error(`${path} references unknown id: ${referenceId}.`);
  }

  return value;
}

function requireStringArray(values, path, options = {}) {
  if (!Array.isArray(values)) {
    throw new Error(`${path} must be an array.`);
  }
  if (values.length === 0 && options.allowEmpty !== true) {
    throw new Error(`${path} must not be empty.`);
  }

  for (const [index, value] of values.entries()) {
    requireNonEmptyString(value, `${path}[${index}]`);
  }

  return values;
}

function requireRecordArray(values, path) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`${path} must be a non-empty array.`);
  }

  for (const [index, value] of values.entries()) {
    if (!isRecord(value)) {
      throw new Error(`${path}[${index}] must be an object.`);
    }
  }

  return values;
}

function requireHourRange(entry, path) {
  if (!Number.isInteger(entry.startHour) || entry.startHour < 0 || entry.startHour > 23) {
    throw new Error(`${path}.startHour must be an integer from 0 to 23.`);
  }

  if (!Number.isInteger(entry.endHour) || entry.endHour < 1 || entry.endHour > 24) {
    throw new Error(`${path}.endHour must be an integer from 1 to 24.`);
  }

  if (entry.startHour >= entry.endHour) {
    throw new Error(`${path}.startHour must be less than endHour.`);
  }
}

function rejectDuplicates(values, path) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`${path} contains duplicate value: ${value}.`);
    }
    seen.add(value);
  }
}

function requireNonEmptyString(value, path) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${path} must be a non-empty string.`);
  }

  return value;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
