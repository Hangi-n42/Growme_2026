import { listFiles, readJson, readText, runCheck } from "./lib/repo.mjs";

const seedManifestPath = "packages/content-schema/content/npcs.seed.json";
const fixtureDirectory = "packages/content-schema/content/fixtures/";
const idPattern = /^[a-z][a-z0-9_]*$/u;
const placeholderTextPattern = /\b(?:todo|tbd|placeholder|lorem ipsum)\b/iu;

const requiredMinimums = {
  residents: 5,
  items: 8,
  recipes: 3,
  shops: 3,
  contracts: 10,
  zones: 2,
  storyEvents: 3
};

const vendorBounds = {
  buyMin: 0.35,
  buyMax: 0.6,
  sellMin: 1,
  sellMax: 1.5
};

runCheck("content schema package exports runtime validation", () => {
  const source = readText("packages/content-schema/src/index.ts");
  for (const expected of [
    "export interface ContentManifest",
    "validateContentManifest",
    "assertValidContentManifest",
    "loadValidatedContentManifest"
  ]) {
    if (!source.includes(expected)) {
      throw new Error(`content schema source is missing ${expected}.`);
    }
  }
});

runCheck("v0.1 seed content manifest validates", () => {
  const manifest = readJson(seedManifestPath);
  const errors = validateManifest(manifest);

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
});

runCheck("malformed content fixtures fail with actionable messages", () => {
  const seedManifest = readJson(seedManifestPath);
  const fixtureFiles = listFiles().filter((file) => file.startsWith(fixtureDirectory) && file.endsWith(".fixture.json"));

  if (fixtureFiles.length < 5) {
    throw new Error("Expected at least 5 malformed fixture files.");
  }

  for (const fixtureFile of fixtureFiles) {
    const fixture = readJson(fixtureFile);
    const manifest = applyFixture(seedManifest, fixture.patches);
    const errors = validateManifest(manifest);

    if (errors.length === 0) {
      throw new Error(`${fixtureFile} unexpectedly passed validation.`);
    }

    for (const expectedError of fixture.expectedErrors) {
      if (!errors.some((error) => error.includes(expectedError))) {
        throw new Error(`${fixtureFile} did not report expected error: ${expectedError}\nActual:\n${errors.join("\n")}`);
      }
    }
  }
});

function validateManifest(manifest) {
  const errors = [];
  const localizedKeys = new Set();

  if (!isRecord(manifest)) {
    return ["Content manifest must be an object."];
  }

  if (manifest.schemaVersion !== 1) {
    errors.push(`Unsupported content schema version: ${String(manifest.schemaVersion)}.`);
  }

  if (typeof manifest.contentVersion !== "string" || !/^v0\.1-[a-z0-9-]+$/u.test(manifest.contentVersion)) {
    errors.push("manifest.contentVersion must be deterministic v0.1 metadata.");
  }

  const collections = {
    flags: collectIds(manifest.flags, "flag", errors),
    locations: collectIds(manifest.locations, "location", errors),
    items: collectIds(manifest.items, "item", errors),
    recipes: collectIds(manifest.recipes, "recipe", errors),
    residents: collectIds(manifest.residents, "resident", errors),
    schedules: collectIds(manifest.schedules, "schedule", errors),
    dialogue: collectIds(manifest.dialogue, "dialogue", errors),
    relationshipMilestones: collectIds(manifest.relationshipMilestones, "relationship milestone", errors),
    shops: collectIds(manifest.shops, "shop", errors),
    contracts: collectIds(manifest.contracts, "contract", errors),
    zones: collectIds(manifest.zones, "zone", errors),
    decor: collectIds(manifest.decor, "decor", errors),
    storyEvents: collectIds(manifest.storyEvents, "story event", errors)
  };

  for (const [key, minimum] of Object.entries(requiredMinimums)) {
    if (collections[key].size < minimum) {
      errors.push(`At least ${minimum} ${key} are required for v0.1.`);
    }
  }

  validateLocalizedCollection(collections.flags, "flag", "description", errors, localizedKeys);
  validateLocalizedCollection(collections.locations, "location", "displayName", errors, localizedKeys);
  validateItems(collections, errors, localizedKeys);
  validateRecipes(collections, errors, localizedKeys);
  validateResidents(collections, errors, localizedKeys);
  validateSchedules(collections, errors, localizedKeys);
  validateDialogue(collections, errors, localizedKeys);
  validateRelationships(collections, errors, localizedKeys);
  validateShops(collections, errors, localizedKeys);
  validateContracts(collections, errors, localizedKeys);
  validateZones(collections, errors, localizedKeys);
  validateDecor(collections, errors, localizedKeys);
  validateStoryEvents(collections, errors, localizedKeys);

  return errors;
}

function collectIds(values, collectionName, errors) {
  const ids = new Map();

  if (!Array.isArray(values)) {
    errors.push(`${collectionName} collection must be an array.`);
    return ids;
  }

  for (const [index, value] of values.entries()) {
    if (!isRecord(value)) {
      errors.push(`${collectionName}[${index}] must be an object.`);
      continue;
    }

    if (typeof value.id !== "string" || value.id.trim().length === 0) {
      errors.push(`${collectionName}[${index}].id must be a non-empty string.`);
      continue;
    }

    if (!idPattern.test(value.id)) {
      errors.push(`${collectionName} id must match ${idPattern.toString()}: ${value.id}.`);
    }

    if (ids.has(value.id)) {
      errors.push(`Duplicate ${collectionName} id: ${value.id}`);
      continue;
    }

    ids.set(value.id, value);
  }

  return ids;
}

function validateItems(collections, errors, localizedKeys) {
  const fallbackSourceIds = new Set([...collections.shops.keys(), ...collections.recipes.keys(), ...collections.zones.keys()]);

  for (const [id, item] of collections.items) {
    validateLocalizedText(item.displayName, `item ${id}.displayName`, errors, localizedKeys);
    requireString(item.category, `item ${id}.category`, errors);
    requireIntegerInRange(item.basePrice, 1, 10000, `item ${id}.basePrice`, errors);
    requireIntegerInRange(item.stackLimit, 1, 999, `item ${id}.stackLimit`, errors);
    if (item.progressionCritical === true) {
      for (const sourceId of requireStringArray(item.fallbackSourceIds, `item ${id}.fallbackSourceIds`, errors)) {
        requireReference(sourceId, fallbackSourceIds, `item ${id}.fallbackSourceIds`, errors);
      }
    }
  }
}

function validateRecipes(collections, errors, localizedKeys) {
  for (const [id, recipe] of collections.recipes) {
    validateLocalizedText(recipe.displayName, `recipe ${id}.displayName`, errors, localizedKeys);
    validateItemQuantities(recipe.inputs, `recipe ${id}.inputs`, collections.items, errors);
    validateItemQuantities(recipe.outputs, `recipe ${id}.outputs`, collections.items, errors);
  }
}

function validateResidents(collections, errors, localizedKeys) {
  for (const [id, resident] of collections.residents) {
    validateLocalizedText(resident.displayName, `resident ${id}.displayName`, errors, localizedKeys);
    validateLocalizedText(resident.job, `resident ${id}.job`, errors, localizedKeys);
    requireReference(resident.homeLocationId, collections.locations, `resident ${id}.homeLocationId`, errors);
    requireReference(resident.scheduleId, collections.schedules, `resident ${id}.scheduleId`, errors);
    for (const contractId of requireStringArray(resident.requestHookIds, `resident ${id}.requestHookIds`, errors)) {
      requireReference(contractId, collections.contracts, `resident ${id}.requestHookIds`, errors);
    }
    for (const milestoneId of requireStringArray(resident.relationshipHookIds, `resident ${id}.relationshipHookIds`, errors)) {
      requireReference(milestoneId, collections.relationshipMilestones, `resident ${id}.relationshipHookIds`, errors);
    }
    for (const shopId of optionalStringArray(resident.shopIds, `resident ${id}.shopIds`, errors)) {
      requireReference(shopId, collections.shops, `resident ${id}.shopIds`, errors);
    }
    for (const storyEventId of optionalStringArray(resident.storyEventIds, `resident ${id}.storyEventIds`, errors)) {
      requireReference(storyEventId, collections.storyEvents, `resident ${id}.storyEventIds`, errors);
    }
  }
}

function validateSchedules(collections, errors, localizedKeys) {
  for (const [id, schedule] of collections.schedules) {
    requireReference(schedule.npcId, collections.residents, `schedule ${id}.npcId`, errors);
    if (!Array.isArray(schedule.entries)) {
      errors.push(`schedule ${id}.entries must be an array.`);
      continue;
    }

    const coverageByDayType = new Map();
    for (const [index, entry] of schedule.entries.entries()) {
      const path = `schedule ${id}.entries[${index}]`;
      if (!isRecord(entry)) {
        errors.push(`${path} must be an object.`);
        continue;
      }

      requireReference(entry.locationId, collections.locations, `${path}.locationId`, errors);
      validateLocalizedText(entry.activity, `${path}.activity`, errors, localizedKeys);

      if (
        (entry.dayType === "weekday" || entry.dayType === "weekend") &&
        Number.isInteger(entry.startHour) &&
        Number.isInteger(entry.endHour) &&
        entry.startHour >= 0 &&
        entry.endHour <= 24 &&
        entry.startHour < entry.endHour
      ) {
        const coverage = coverageByDayType.get(entry.dayType) ?? Array.from({ length: 24 }, () => 0);
        for (let hour = entry.startHour; hour < entry.endHour; hour += 1) {
          coverage[hour] += 1;
        }
        coverageByDayType.set(entry.dayType, coverage);
      }
    }

    for (const dayType of ["weekday", "weekend"]) {
      const coverage = coverageByDayType.get(dayType);
      if (!coverage) {
        errors.push(`schedule ${id} must include ${dayType} coverage for every hour.`);
        continue;
      }

      for (let hour = 0; hour < 24; hour += 1) {
        if (coverage[hour] !== 1) {
          errors.push(`schedule ${id} ${dayType} hour ${hour} must resolve to exactly one location.`);
        }
      }
    }
  }
}

function validateDialogue(collections, errors, localizedKeys) {
  const categoriesBySpeaker = new Map();

  for (const [id, line] of collections.dialogue) {
    requireReference(line.speakerId, collections.residents, `dialogue ${id}.speakerId`, errors);
    validateLocalizedText(line.text, `dialogue ${id}.text`, errors, localizedKeys);
    for (const flagId of optionalStringArray(line.setsFlagIds, `dialogue ${id}.setsFlagIds`, errors)) {
      requireReference(flagId, collections.flags, `dialogue ${id}.setsFlagIds`, errors);
    }

    const categories = categoriesBySpeaker.get(line.speakerId) ?? new Set();
    categories.add(line.category);
    categoriesBySpeaker.set(line.speakerId, categories);
  }

  for (const residentId of collections.residents.keys()) {
    const categories = categoriesBySpeaker.get(residentId);
    if (!categories || !categories.has("first_meet") || !categories.has("daily")) {
      errors.push(`resident ${residentId} must have first_meet and daily dialogue lines.`);
    }
  }
}

function validateRelationships(collections, errors, localizedKeys) {
  for (const [id, milestone] of collections.relationshipMilestones) {
    requireReference(milestone.npcId, collections.residents, `relationship milestone ${id}.npcId`, errors);
    requireIntegerInRange(milestone.threshold, 0, 100, `relationship milestone ${id}.threshold`, errors);
    validateLocalizedText(milestone.description, `relationship milestone ${id}.description`, errors, localizedKeys);
    requireReference(milestone.setsFlagId, collections.flags, `relationship milestone ${id}.setsFlagId`, errors);
  }
}

function validateShops(collections, errors, localizedKeys) {
  for (const [id, shop] of collections.shops) {
    validateLocalizedText(shop.displayName, `shop ${id}.displayName`, errors, localizedKeys);
    requireReference(shop.ownerNpcId, collections.residents, `shop ${id}.ownerNpcId`, errors);
    requireReference(shop.locationId, collections.locations, `shop ${id}.locationId`, errors);
    for (const [index, stock] of requiredRecords(shop.stock, `shop ${id}.stock`, errors).entries()) {
      requireReference(stock.itemId, collections.items, `shop ${id}.stock[${index}].itemId`, errors);
      requireIntegerInRange(stock.quantity, 1, 999, `shop ${id}.stock[${index}].quantity`, errors);
    }
    requireNumberInRange(shop.buyMultiplier, vendorBounds.buyMin, vendorBounds.buyMax, `shop ${id}.buyMultiplier`, errors);
    requireNumberInRange(shop.sellMultiplier, vendorBounds.sellMin, vendorBounds.sellMax, `shop ${id}.sellMultiplier`, errors);
    if (typeof shop.buyMultiplier === "number" && typeof shop.sellMultiplier === "number" && shop.sellMultiplier <= shop.buyMultiplier) {
      errors.push(`shop ${id}.sellMultiplier must be greater than buyMultiplier.`);
    }
  }
}

function validateContracts(collections, errors, localizedKeys) {
  for (const [id, contract] of collections.contracts) {
    requireReference(contract.requesterNpcId, collections.residents, `contract ${id}.requesterNpcId`, errors);
    validateLocalizedText(contract.title, `contract ${id}.title`, errors, localizedKeys);
    validateLocalizedText(contract.description, `contract ${id}.description`, errors, localizedKeys);
    validateContractObjective(contract.objective, `contract ${id}.objective`, collections, errors);
    if (!isRecord(contract.reward)) {
      errors.push(`contract ${id}.reward must be an object.`);
    } else {
      requireIntegerInRange(contract.reward.currency, 1, 500, `contract ${id}.reward.currency`, errors);
      if (contract.reward.affinity !== undefined) {
        requireIntegerInRange(contract.reward.affinity, 0, 25, `contract ${id}.reward.affinity`, errors);
      }
    }
    requireReference(contract.memoryFlagId, collections.flags, `contract ${id}.memoryFlagId`, errors);
  }
}

function validateContractObjective(objective, path, collections, errors) {
  if (!isRecord(objective)) {
    errors.push(`${path} must be an object.`);
    return;
  }

  if (["fetchItem", "deliverItem", "growCrop", "gatherZone"].includes(objective.type)) {
    requireReference(objective.itemId, collections.items, `${path}.itemId`, errors);
    requireIntegerInRange(objective.quantity, 1, 999, `${path}.quantity`, errors);
  }

  if (objective.type === "craftItem") {
    requireReference(objective.recipeId, collections.recipes, `${path}.recipeId`, errors);
    requireIntegerInRange(objective.quantity, 1, 999, `${path}.quantity`, errors);
  }

  if (objective.type === "visitLocation") {
    requireReference(objective.locationId, collections.locations, `${path}.locationId`, errors);
  }

  if (objective.type === "gatherZone") {
    requireReference(objective.zoneId, collections.zones, `${path}.zoneId`, errors);
  }
}

function validateZones(collections, errors, localizedKeys) {
  for (const [id, zone] of collections.zones) {
    validateLocalizedText(zone.displayName, `zone ${id}.displayName`, errors, localizedKeys);
    requireReference(zone.locationId, collections.locations, `zone ${id}.locationId`, errors);
    for (const [index, action] of requiredRecords(zone.actions, `zone ${id}.actions`, errors).entries()) {
      const path = `zone ${id}.actions[${index}]`;
      validateLocalizedText(action.displayName, `${path}.displayName`, errors, localizedKeys);
      for (const [rewardIndex, reward] of requiredRecords(action.rewards, `${path}.rewards`, errors).entries()) {
        requireReference(reward.itemId, collections.items, `${path}.rewards[${rewardIndex}].itemId`, errors);
      }
    }
  }
}

function validateDecor(collections, errors, localizedKeys) {
  for (const [id, decor] of collections.decor) {
    validateLocalizedText(decor.displayName, `decor ${id}.displayName`, errors, localizedKeys);
    requireReference(decor.itemId, collections.items, `decor ${id}.itemId`, errors);
  }
}

function validateStoryEvents(collections, errors, localizedKeys) {
  for (const [id, storyEvent] of collections.storyEvents) {
    validateLocalizedText(storyEvent.title, `story event ${id}.title`, errors, localizedKeys);
    validateLocalizedText(storyEvent.summary, `story event ${id}.summary`, errors, localizedKeys);
    for (const flagId of optionalStringArray(storyEvent.triggerFlagIds, `story event ${id}.triggerFlagIds`, errors)) {
      requireReference(flagId, collections.flags, `story event ${id}.triggerFlagIds`, errors);
    }
    for (const flagId of requireStringArray(storyEvent.setsFlagIds, `story event ${id}.setsFlagIds`, errors)) {
      requireReference(flagId, collections.flags, `story event ${id}.setsFlagIds`, errors);
    }
    for (const npcId of optionalStringArray(storyEvent.participantNpcIds, `story event ${id}.participantNpcIds`, errors)) {
      requireReference(npcId, collections.residents, `story event ${id}.participantNpcIds`, errors);
    }
    for (const lineId of optionalStringArray(storyEvent.dialogueLineIds, `story event ${id}.dialogueLineIds`, errors)) {
      requireReference(lineId, collections.dialogue, `story event ${id}.dialogueLineIds`, errors);
    }
  }
}

function validateLocalizedCollection(collection, collectionName, fieldName, errors, localizedKeys) {
  for (const [id, value] of collection) {
    validateLocalizedText(value[fieldName], `${collectionName} ${id}.${fieldName}`, errors, localizedKeys);
  }
}

function validateLocalizedText(value, path, errors, localizedKeys) {
  if (!isRecord(value)) {
    errors.push(`${path} must be a localized text object.`);
    return;
  }

  requireString(value.key, `${path}.key`, errors);
  requireString(value.text, `${path}.text`, errors);

  if (typeof value.key === "string") {
    if (localizedKeys.has(value.key)) {
      errors.push(`Duplicate localized text key: ${value.key}.`);
    }
    localizedKeys.add(value.key);
  }

  if (typeof value.text === "string" && (placeholderTextPattern.test(value.text) || /^npc\s*\d*$/iu.test(value.text.trim()))) {
    errors.push(`${path}.text contains placeholder player-facing text.`);
  }
}

function validateItemQuantities(values, path, itemIds, errors) {
  for (const [index, value] of requiredRecords(values, path, errors).entries()) {
    requireReference(value.itemId, itemIds, `${path}[${index}].itemId`, errors);
    requireIntegerInRange(value.quantity, 1, 999, `${path}[${index}].quantity`, errors);
  }
}

function requiredRecords(values, path, errors) {
  if (!Array.isArray(values) || values.length === 0) {
    errors.push(`${path} must be a non-empty array.`);
    return [];
  }

  return values.filter((value, index) => {
    if (!isRecord(value)) {
      errors.push(`${path}[${index}] must be an object.`);
      return false;
    }
    return true;
  });
}

function requireReference(id, validIds, path, errors) {
  if (typeof id !== "string" || id.trim().length === 0) {
    errors.push(`${path} must be a non-empty string.`);
    return;
  }

  if (!validIds.has(id)) {
    errors.push(`${path} references unknown id: ${id}`);
  }
}

function requireString(value, path, errors) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} must be a non-empty string`);
  }
}

function requireStringArray(values, path, errors) {
  if (!Array.isArray(values) || values.length === 0) {
    errors.push(`${path} must be a non-empty array.`);
    return [];
  }

  return optionalStringArray(values, path, errors);
}

function optionalStringArray(values, path, errors) {
  if (values === undefined) {
    return [];
  }

  if (!Array.isArray(values)) {
    errors.push(`${path} must be an array.`);
    return [];
  }

  return values.filter((value, index) => {
    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`${path}[${index}] must be a non-empty string.`);
      return false;
    }
    return true;
  });
}

function requireIntegerInRange(value, min, max, path, errors) {
  if (!Number.isInteger(value)) {
    errors.push(`${path} must be an integer.`);
    return;
  }

  if (value < min || value > max) {
    errors.push(`${path} must be between ${min} and ${max}.`);
  }
}

function requireNumberInRange(value, min, max, path, errors) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${path} must be a finite number.`);
    return;
  }

  if (value < min || value > max) {
    errors.push(`${path} must be between ${min} and ${max}.`);
  }
}

function applyFixture(seedManifest, patches) {
  const manifest = JSON.parse(JSON.stringify(seedManifest));

  for (const patch of patches) {
    if (patch.op !== "replace" || !Array.isArray(patch.path) || patch.path.length === 0) {
      throw new Error(`Unsupported fixture patch: ${JSON.stringify(patch)}`);
    }

    let target = manifest;
    for (const segment of patch.path.slice(0, -1)) {
      target = target[segment];
    }

    target[patch.path.at(-1)] = patch.value;
  }

  return manifest;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
