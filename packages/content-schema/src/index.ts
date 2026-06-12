export const CONTENT_SCHEMA_VERSION = 1;
export const REQUIRED_V0_1_RESIDENT_COUNT = 5;
export const REQUIRED_V0_1_ITEM_COUNT = 8;
export const REQUIRED_V0_1_RECIPE_COUNT = 3;
export const REQUIRED_V0_1_SHOP_COUNT = 3;
export const REQUIRED_V0_1_CONTRACT_COUNT = 10;
export const REQUIRED_V0_1_ZONE_COUNT = 2;
export const REQUIRED_V0_1_STORY_EVENT_COUNT = 3;

export const CONTRACT_REWARD_CURRENCY_MIN = 1;
export const CONTRACT_REWARD_CURRENCY_MAX = 500;
export const CONTRACT_REWARD_AFFINITY_MAX = 25;

export const VENDOR_BUY_MULTIPLIER_MIN = 0.35;
export const VENDOR_BUY_MULTIPLIER_MAX = 0.6;
export const VENDOR_SELL_MULTIPLIER_MIN = 1;
export const VENDOR_SELL_MULTIPLIER_MAX = 1.5;

const CONTENT_ID_PATTERN = /^[a-z][a-z0-9_]*$/u;
const CONTENT_VERSION_PATTERN = /^v0\.1-[a-z0-9-]+$/u;
const LOCALE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/u;
const PLACEHOLDER_TEXT_PATTERN = /\b(?:todo|tbd|placeholder|lorem ipsum)\b/iu;

const DIALOGUE_CATEGORIES = new Set([
  "first_meet",
  "daily",
  "weather",
  "shop",
  "gift_like",
  "gift_dislike",
  "request_offer",
  "request_progress",
  "request_complete",
  "relationship_milestone",
  "story_event"
]);

const SCHEDULE_DAY_TYPES = new Set(["weekday", "weekend", "rain", "story"]);
const REQUIRED_SCHEDULE_DAY_TYPES = ["weekday", "weekend"] as const;
const CONTRACT_OBJECTIVE_TYPES = new Set([
  "fetchItem",
  "deliverItem",
  "growCrop",
  "craftItem",
  "visitLocation",
  "gatherZone"
]);
const DECOR_PLACEMENTS = new Set(["home", "farm", "both"]);
const RELATIONSHIP_THRESHOLDS = new Set([20, 40, 60, 80]);

export interface LocalizedText {
  readonly key: string;
  readonly text: string;
}

export interface ContentReference {
  readonly id: string;
  readonly displayName: LocalizedText;
}

export interface FlagContent {
  readonly id: string;
  readonly description: LocalizedText;
}

export interface LocationContent extends ContentReference {
  readonly kind: "home" | "shop" | "village" | "farm" | "zone" | "mine";
}

export interface ItemContent extends ContentReference {
  readonly category: string;
  readonly basePrice: number;
  readonly rarity: "common" | "uncommon" | "rare";
  readonly stackLimit: number;
  readonly vendor: {
    readonly buyable: boolean;
    readonly sellable: boolean;
  };
  readonly progressionCritical?: boolean;
  readonly fallbackSourceIds?: readonly string[];
}

export interface ItemQuantity {
  readonly itemId: string;
  readonly quantity: number;
}

export interface RecipeContent extends ContentReference {
  readonly category: string;
  readonly inputs: readonly ItemQuantity[];
  readonly outputs: readonly ItemQuantity[];
  readonly craftMinutes: number;
  readonly unlockFlagIds?: readonly string[];
}

export interface ResidentContent extends ContentReference {
  readonly job: LocalizedText;
  readonly homeLocationId: string;
  readonly scheduleId: string;
  readonly preferenceTags: readonly string[];
  readonly requestHookIds: readonly string[];
  readonly relationshipHookIds: readonly string[];
  readonly shopIds: readonly string[];
  readonly storyEventIds: readonly string[];
}

export interface ScheduleEntryContent {
  readonly dayType: "weekday" | "weekend" | "rain" | "story";
  readonly startHour: number;
  readonly endHour: number;
  readonly locationId: string;
  readonly activity: LocalizedText;
}

export interface NpcScheduleContent {
  readonly id: string;
  readonly npcId: string;
  readonly entries: readonly ScheduleEntryContent[];
}

export interface DialogueConditionContent {
  readonly requiredFlagIds?: readonly string[];
  readonly blockedFlagIds?: readonly string[];
  readonly minAffinity?: number;
  readonly activeContractId?: string;
}

export interface DialogueLineContent {
  readonly id: string;
  readonly speakerId: string;
  readonly category: string;
  readonly text: LocalizedText;
  readonly conditions?: DialogueConditionContent;
  readonly priority: number;
  readonly cooldownDays: number;
  readonly setsFlagIds?: readonly string[];
}

export interface RelationshipMilestoneContent {
  readonly id: string;
  readonly npcId: string;
  readonly threshold: number;
  readonly description: LocalizedText;
  readonly setsFlagId: string;
  readonly dialogueLineId?: string;
}

export interface ShopStockContent {
  readonly itemId: string;
  readonly quantity: number;
  readonly restockIntervalDays: number;
}

export interface ShopContent extends ContentReference {
  readonly ownerNpcId: string;
  readonly locationId: string;
  readonly stock: readonly ShopStockContent[];
  readonly acceptedCategories: readonly string[];
  readonly dailyBudget: number;
  readonly buyMultiplier: number;
  readonly sellMultiplier: number;
}

export interface ContractObjectiveContent {
  readonly type: "fetchItem" | "deliverItem" | "growCrop" | "craftItem" | "visitLocation" | "gatherZone";
  readonly itemId?: string;
  readonly recipeId?: string;
  readonly locationId?: string;
  readonly zoneId?: string;
  readonly quantity?: number;
}

export interface ContractRewardContent {
  readonly currency: number;
  readonly affinity?: number;
  readonly items?: readonly ItemQuantity[];
}

export interface ContractContent {
  readonly id: string;
  readonly requesterNpcId: string;
  readonly title: LocalizedText;
  readonly description: LocalizedText;
  readonly objective: ContractObjectiveContent;
  readonly deadlineDays: number;
  readonly reward: ContractRewardContent;
  readonly repeatCooldownDays: number;
  readonly memoryFlagId: string;
}

export interface ZoneRewardContent {
  readonly itemId: string;
  readonly minQuantity: number;
  readonly maxQuantity: number;
  readonly weight: number;
}

export interface ZoneActionContent extends ContentReference {
  readonly energyCost: number;
  readonly rewards: readonly ZoneRewardContent[];
  readonly requiredFlagIds?: readonly string[];
}

export interface ZoneContent extends ContentReference {
  readonly locationId: string;
  readonly dailyActionLimit: number;
  readonly actions: readonly ZoneActionContent[];
}

export interface DecorContent extends ContentReference {
  readonly itemId: string;
  readonly category: string;
  readonly size: {
    readonly width: number;
    readonly height: number;
  };
  readonly supportsRotation: boolean;
  readonly placement: "home" | "farm" | "both";
}

export interface StoryEventContent {
  readonly id: string;
  readonly title: LocalizedText;
  readonly summary: LocalizedText;
  readonly triggerFlagIds: readonly string[];
  readonly setsFlagIds: readonly string[];
  readonly participantNpcIds: readonly string[];
  readonly dialogueLineIds: readonly string[];
}

export interface ContentManifest {
  readonly schemaVersion: typeof CONTENT_SCHEMA_VERSION;
  readonly contentVersion: string;
  readonly defaultLocale: string;
  readonly flags: readonly FlagContent[];
  readonly locations: readonly LocationContent[];
  readonly items: readonly ItemContent[];
  readonly recipes: readonly RecipeContent[];
  readonly residents: readonly ResidentContent[];
  readonly schedules: readonly NpcScheduleContent[];
  readonly dialogue: readonly DialogueLineContent[];
  readonly relationshipMilestones: readonly RelationshipMilestoneContent[];
  readonly shops: readonly ShopContent[];
  readonly contracts: readonly ContractContent[];
  readonly zones: readonly ZoneContent[];
  readonly decor: readonly DecorContent[];
  readonly storyEvents: readonly StoryEventContent[];
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

type ContentRecord = Record<string, unknown>;

interface ValidationContext {
  readonly errors: string[];
  readonly localizedKeys: Set<string>;
}

interface ManifestCollections {
  readonly flags: Map<string, ContentRecord>;
  readonly locations: Map<string, ContentRecord>;
  readonly items: Map<string, ContentRecord>;
  readonly recipes: Map<string, ContentRecord>;
  readonly residents: Map<string, ContentRecord>;
  readonly schedules: Map<string, ContentRecord>;
  readonly dialogue: Map<string, ContentRecord>;
  readonly relationshipMilestones: Map<string, ContentRecord>;
  readonly shops: Map<string, ContentRecord>;
  readonly contracts: Map<string, ContentRecord>;
  readonly zones: Map<string, ContentRecord>;
  readonly decor: Map<string, ContentRecord>;
  readonly storyEvents: Map<string, ContentRecord>;
}

export function validateContentManifest(manifest: unknown): readonly string[] {
  return validateContentManifestDetailed(manifest).errors;
}

export function validateContentManifestDetailed(manifest: unknown): ValidationResult {
  const context: ValidationContext = {
    errors: [],
    localizedKeys: new Set<string>()
  };

  if (!isRecord(manifest)) {
    return {
      ok: false,
      errors: ["Content manifest must be an object."]
    };
  }

  validateManifestMetadata(manifest, context);

  const collections: ManifestCollections = {
    flags: buildCollectionMap(readArray(manifest, "flags", "manifest.flags", context), "flag", context),
    locations: buildCollectionMap(readArray(manifest, "locations", "manifest.locations", context), "location", context),
    items: buildCollectionMap(readArray(manifest, "items", "manifest.items", context), "item", context),
    recipes: buildCollectionMap(readArray(manifest, "recipes", "manifest.recipes", context), "recipe", context),
    residents: buildCollectionMap(readArray(manifest, "residents", "manifest.residents", context), "resident", context),
    schedules: buildCollectionMap(readArray(manifest, "schedules", "manifest.schedules", context), "schedule", context),
    dialogue: buildCollectionMap(readArray(manifest, "dialogue", "manifest.dialogue", context), "dialogue", context),
    relationshipMilestones: buildCollectionMap(
      readArray(manifest, "relationshipMilestones", "manifest.relationshipMilestones", context),
      "relationship milestone",
      context
    ),
    shops: buildCollectionMap(readArray(manifest, "shops", "manifest.shops", context), "shop", context),
    contracts: buildCollectionMap(readArray(manifest, "contracts", "manifest.contracts", context), "contract", context),
    zones: buildCollectionMap(readArray(manifest, "zones", "manifest.zones", context), "zone", context),
    decor: buildCollectionMap(readArray(manifest, "decor", "manifest.decor", context), "decor", context),
    storyEvents: buildCollectionMap(
      readArray(manifest, "storyEvents", "manifest.storyEvents", context),
      "story event",
      context
    )
  };

  validateReleaseMinimums(collections, context);
  validateFlags(collections.flags, context);
  validateLocations(collections.locations, context);
  validateItems(collections.items, collections, context);
  validateRecipes(collections.recipes, collections, context);
  validateResidents(collections.residents, collections, context);
  validateSchedules(collections.schedules, collections, context);
  validateDialogue(collections.dialogue, collections, context);
  validateRelationshipMilestones(collections.relationshipMilestones, collections, context);
  validateShops(collections.shops, collections, context);
  validateContracts(collections.contracts, collections, context);
  validateZones(collections.zones, collections, context);
  validateDecor(collections.decor, collections, context);
  validateStoryEvents(collections.storyEvents, collections, context);

  return {
    ok: context.errors.length === 0,
    errors: context.errors
  };
}

export function assertValidContentManifest(manifest: unknown): asserts manifest is ContentManifest {
  const errors = validateContentManifest(manifest);

  if (errors.length > 0) {
    throw new Error(`Invalid content manifest:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }
}

export function loadValidatedContentManifest(manifest: unknown): ContentManifest {
  assertValidContentManifest(manifest);
  return manifest;
}

function validateManifestMetadata(manifest: ContentRecord, context: ValidationContext): void {
  if (manifest["schemaVersion"] !== CONTENT_SCHEMA_VERSION) {
    context.errors.push(`Unsupported content schema version: ${String(manifest["schemaVersion"])}.`);
  }

  const contentVersion = readString(manifest, "contentVersion", "manifest.contentVersion", context);
  if (contentVersion !== undefined && !CONTENT_VERSION_PATTERN.test(contentVersion)) {
    context.errors.push(
      `manifest.contentVersion must match ${CONTENT_VERSION_PATTERN.toString()} for deterministic v0.1 content metadata.`
    );
  }

  const defaultLocale = readString(manifest, "defaultLocale", "manifest.defaultLocale", context);
  if (defaultLocale !== undefined && !LOCALE_PATTERN.test(defaultLocale)) {
    context.errors.push("manifest.defaultLocale must be a locale such as en or en-US.");
  }
}

function validateReleaseMinimums(collections: ManifestCollections, context: ValidationContext): void {
  requireMinimum(collections.residents, REQUIRED_V0_1_RESIDENT_COUNT, "residents", context);
  requireMinimum(collections.items, REQUIRED_V0_1_ITEM_COUNT, "items", context);
  requireMinimum(collections.recipes, REQUIRED_V0_1_RECIPE_COUNT, "recipes", context);
  requireMinimum(collections.shops, REQUIRED_V0_1_SHOP_COUNT, "shops", context);
  requireMinimum(collections.contracts, REQUIRED_V0_1_CONTRACT_COUNT, "contracts", context);
  requireMinimum(collections.zones, REQUIRED_V0_1_ZONE_COUNT, "zones", context);
  requireMinimum(collections.storyEvents, REQUIRED_V0_1_STORY_EVENT_COUNT, "story events", context);
}

function validateFlags(flags: Map<string, ContentRecord>, context: ValidationContext): void {
  for (const [id, flag] of flags) {
    validateLocalizedText(flag["description"], `flag ${id}.description`, context);
  }
}

function validateLocations(locations: Map<string, ContentRecord>, context: ValidationContext): void {
  const allowedKinds = new Set(["home", "shop", "village", "farm", "zone", "mine"]);

  for (const [id, location] of locations) {
    validateLocalizedText(location["displayName"], `location ${id}.displayName`, context);
    validateEnum(location["kind"], allowedKinds, `location ${id}.kind`, context);
  }
}

function validateItems(
  items: Map<string, ContentRecord>,
  collections: ManifestCollections,
  context: ValidationContext
): void {
  const sourceIds = new Set<string>([
    ...collections.shops.keys(),
    ...collections.recipes.keys(),
    ...collections.zones.keys()
  ]);

  for (const [id, item] of items) {
    validateLocalizedText(item["displayName"], `item ${id}.displayName`, context);
    readString(item, "category", `item ${id}.category`, context);
    validateEnum(item["rarity"], new Set(["common", "uncommon", "rare"]), `item ${id}.rarity`, context);
    readIntegerInRange(item, "basePrice", `item ${id}.basePrice`, 1, 10000, context);
    readIntegerInRange(item, "stackLimit", `item ${id}.stackLimit`, 1, 999, context);

    const vendor = readRecord(item, "vendor", `item ${id}.vendor`, context);
    if (vendor !== undefined) {
      readBoolean(vendor, "buyable", `item ${id}.vendor.buyable`, context);
      readBoolean(vendor, "sellable", `item ${id}.vendor.sellable`, context);
    }

    if (item["progressionCritical"] === true) {
      const fallbackSourceIds = readStringArray(
        item,
        "fallbackSourceIds",
        `item ${id}.fallbackSourceIds`,
        context,
        { allowMissing: false, allowEmpty: false }
      );
      validateReferences(fallbackSourceIds, sourceIds, `item ${id}.fallbackSourceIds`, context);
    }
  }
}

function validateRecipes(
  recipes: Map<string, ContentRecord>,
  collections: ManifestCollections,
  context: ValidationContext
): void {
  for (const [id, recipe] of recipes) {
    validateLocalizedText(recipe["displayName"], `recipe ${id}.displayName`, context);
    readString(recipe, "category", `recipe ${id}.category`, context);
    readIntegerInRange(recipe, "craftMinutes", `recipe ${id}.craftMinutes`, 0, 24 * 60, context);
    validateItemQuantities(recipe["inputs"], `recipe ${id}.inputs`, collections.items, context, { allowEmpty: false });
    validateItemQuantities(recipe["outputs"], `recipe ${id}.outputs`, collections.items, context, { allowEmpty: false });

    const unlockFlagIds = readStringArray(recipe, "unlockFlagIds", `recipe ${id}.unlockFlagIds`, context);
    validateReferences(unlockFlagIds, collections.flags, `recipe ${id}.unlockFlagIds`, context);
  }
}

function validateResidents(
  residents: Map<string, ContentRecord>,
  collections: ManifestCollections,
  context: ValidationContext
): void {
  for (const [id, resident] of residents) {
    validateLocalizedText(resident["displayName"], `resident ${id}.displayName`, context);
    validateLocalizedText(resident["job"], `resident ${id}.job`, context);
    validateReference(
      readString(resident, "homeLocationId", `resident ${id}.homeLocationId`, context),
      collections.locations,
      `resident ${id}.homeLocationId`,
      context
    );
    validateReference(
      readString(resident, "scheduleId", `resident ${id}.scheduleId`, context),
      collections.schedules,
      `resident ${id}.scheduleId`,
      context
    );
    readStringArray(resident, "preferenceTags", `resident ${id}.preferenceTags`, context, {
      allowMissing: false,
      allowEmpty: false
    });
    validateReferences(
      readStringArray(resident, "requestHookIds", `resident ${id}.requestHookIds`, context, {
        allowMissing: false,
        allowEmpty: false
      }),
      collections.contracts,
      `resident ${id}.requestHookIds`,
      context
    );
    validateReferences(
      readStringArray(resident, "relationshipHookIds", `resident ${id}.relationshipHookIds`, context, {
        allowMissing: false,
        allowEmpty: false
      }),
      collections.relationshipMilestones,
      `resident ${id}.relationshipHookIds`,
      context
    );
    validateReferences(
      readStringArray(resident, "shopIds", `resident ${id}.shopIds`, context),
      collections.shops,
      `resident ${id}.shopIds`,
      context
    );
    validateReferences(
      readStringArray(resident, "storyEventIds", `resident ${id}.storyEventIds`, context),
      collections.storyEvents,
      `resident ${id}.storyEventIds`,
      context
    );
  }
}

function validateSchedules(
  schedules: Map<string, ContentRecord>,
  collections: ManifestCollections,
  context: ValidationContext
): void {
  for (const [id, schedule] of schedules) {
    const npcId = readString(schedule, "npcId", `schedule ${id}.npcId`, context);
    validateReference(npcId, collections.residents, `schedule ${id}.npcId`, context);

    const entries = readArray(schedule, "entries", `schedule ${id}.entries`, context);
    const coverageByDayType = new Map<string, number[]>();

    for (const [index, entryValue] of entries.entries()) {
      const path = `schedule ${id}.entries[${index}]`;
      if (!isRecord(entryValue)) {
        context.errors.push(`${path} must be an object.`);
        continue;
      }

      const dayType = readString(entryValue, "dayType", `${path}.dayType`, context);
      if (dayType !== undefined) {
        validateEnum(dayType, SCHEDULE_DAY_TYPES, `${path}.dayType`, context);
      }

      const startHour = readIntegerInRange(entryValue, "startHour", `${path}.startHour`, 0, 23, context);
      const endHour = readIntegerInRange(entryValue, "endHour", `${path}.endHour`, 1, 24, context);
      if (startHour !== undefined && endHour !== undefined && startHour >= endHour) {
        context.errors.push(`${path}.startHour must be less than endHour.`);
      }

      validateReference(
        readString(entryValue, "locationId", `${path}.locationId`, context),
        collections.locations,
        `${path}.locationId`,
        context
      );
      validateLocalizedText(entryValue["activity"], `${path}.activity`, context);

      if (
        dayType !== undefined &&
        startHour !== undefined &&
        endHour !== undefined &&
        SCHEDULE_DAY_TYPES.has(dayType) &&
        startHour < endHour
      ) {
        const coverage = coverageByDayType.get(dayType) ?? Array.from({ length: 24 }, () => 0);
        for (let hour = startHour; hour < endHour; hour += 1) {
          coverage[hour] = (coverage[hour] ?? 0) + 1;
        }

        coverageByDayType.set(dayType, coverage);
      }
    }

    for (const dayType of REQUIRED_SCHEDULE_DAY_TYPES) {
      const coverage = coverageByDayType.get(dayType);
      if (coverage === undefined) {
        context.errors.push(`schedule ${id} must include ${dayType} coverage for every hour.`);
        continue;
      }

      for (let hour = 0; hour < 24; hour += 1) {
        if (coverage[hour] !== 1) {
          context.errors.push(`schedule ${id} ${dayType} hour ${hour} must resolve to exactly one location.`);
        }
      }
    }
  }
}

function validateDialogue(
  dialogue: Map<string, ContentRecord>,
  collections: ManifestCollections,
  context: ValidationContext
): void {
  const categoriesBySpeaker = new Map<string, Set<string>>();

  for (const [id, line] of dialogue) {
    const speakerId = readString(line, "speakerId", `dialogue ${id}.speakerId`, context);
    validateReference(speakerId, collections.residents, `dialogue ${id}.speakerId`, context);
    const category = readString(line, "category", `dialogue ${id}.category`, context);
    if (category !== undefined) {
      validateEnum(category, DIALOGUE_CATEGORIES, `dialogue ${id}.category`, context);
    }
    validateLocalizedText(line["text"], `dialogue ${id}.text`, context);
    readIntegerInRange(line, "priority", `dialogue ${id}.priority`, 0, 1000, context);
    readIntegerInRange(line, "cooldownDays", `dialogue ${id}.cooldownDays`, 0, 365, context);
    validateReferences(
      readStringArray(line, "setsFlagIds", `dialogue ${id}.setsFlagIds`, context),
      collections.flags,
      `dialogue ${id}.setsFlagIds`,
      context
    );

    const conditions = line["conditions"];
    if (conditions !== undefined) {
      validateDialogueConditions(conditions, `dialogue ${id}.conditions`, collections, context);
    }

    if (speakerId !== undefined && category !== undefined) {
      const categories = categoriesBySpeaker.get(speakerId) ?? new Set<string>();
      categories.add(category);
      categoriesBySpeaker.set(speakerId, categories);
    }
  }

  for (const residentId of collections.residents.keys()) {
    const categories = categoriesBySpeaker.get(residentId);
    if (categories === undefined || !categories.has("first_meet") || !categories.has("daily")) {
      context.errors.push(`resident ${residentId} must have first_meet and daily dialogue lines.`);
    }
  }
}

function validateDialogueConditions(
  value: unknown,
  path: string,
  collections: ManifestCollections,
  context: ValidationContext
): void {
  if (!isRecord(value)) {
    context.errors.push(`${path} must be an object.`);
    return;
  }

  validateReferences(
    readStringArray(value, "requiredFlagIds", `${path}.requiredFlagIds`, context),
    collections.flags,
    `${path}.requiredFlagIds`,
    context
  );
  validateReferences(
    readStringArray(value, "blockedFlagIds", `${path}.blockedFlagIds`, context),
    collections.flags,
    `${path}.blockedFlagIds`,
    context
  );
  validateReference(
    readOptionalString(value, "activeContractId", `${path}.activeContractId`, context),
    collections.contracts,
    `${path}.activeContractId`,
    context
  );

  if (value["minAffinity"] !== undefined) {
    readIntegerInRange(value, "minAffinity", `${path}.minAffinity`, 0, 100, context);
  }
}

function validateRelationshipMilestones(
  milestones: Map<string, ContentRecord>,
  collections: ManifestCollections,
  context: ValidationContext
): void {
  for (const [id, milestone] of milestones) {
    validateReference(
      readString(milestone, "npcId", `relationship milestone ${id}.npcId`, context),
      collections.residents,
      `relationship milestone ${id}.npcId`,
      context
    );
    const threshold = readIntegerInRange(
      milestone,
      "threshold",
      `relationship milestone ${id}.threshold`,
      0,
      100,
      context
    );
    if (threshold !== undefined && !RELATIONSHIP_THRESHOLDS.has(threshold)) {
      context.errors.push(`relationship milestone ${id}.threshold must be one of 20, 40, 60, or 80.`);
    }
    validateLocalizedText(milestone["description"], `relationship milestone ${id}.description`, context);
    validateReference(
      readString(milestone, "setsFlagId", `relationship milestone ${id}.setsFlagId`, context),
      collections.flags,
      `relationship milestone ${id}.setsFlagId`,
      context
    );
    validateReference(
      readOptionalString(milestone, "dialogueLineId", `relationship milestone ${id}.dialogueLineId`, context),
      collections.dialogue,
      `relationship milestone ${id}.dialogueLineId`,
      context
    );
  }
}

function validateShops(
  shops: Map<string, ContentRecord>,
  collections: ManifestCollections,
  context: ValidationContext
): void {
  for (const [id, shop] of shops) {
    validateLocalizedText(shop["displayName"], `shop ${id}.displayName`, context);
    validateReference(
      readString(shop, "ownerNpcId", `shop ${id}.ownerNpcId`, context),
      collections.residents,
      `shop ${id}.ownerNpcId`,
      context
    );
    validateReference(
      readString(shop, "locationId", `shop ${id}.locationId`, context),
      collections.locations,
      `shop ${id}.locationId`,
      context
    );

    const stock = readArray(shop, "stock", `shop ${id}.stock`, context, { allowEmpty: false });
    for (const [index, stockValue] of stock.entries()) {
      const path = `shop ${id}.stock[${index}]`;
      if (!isRecord(stockValue)) {
        context.errors.push(`${path} must be an object.`);
        continue;
      }

      validateReference(
        readString(stockValue, "itemId", `${path}.itemId`, context),
        collections.items,
        `${path}.itemId`,
        context
      );
      readIntegerInRange(stockValue, "quantity", `${path}.quantity`, 1, 999, context);
      readIntegerInRange(stockValue, "restockIntervalDays", `${path}.restockIntervalDays`, 1, 30, context);
    }

    readStringArray(shop, "acceptedCategories", `shop ${id}.acceptedCategories`, context, {
      allowMissing: false,
      allowEmpty: false
    });
    readIntegerInRange(shop, "dailyBudget", `shop ${id}.dailyBudget`, 1, 100000, context);
    const buyMultiplier = readNumberInRange(
      shop,
      "buyMultiplier",
      `shop ${id}.buyMultiplier`,
      VENDOR_BUY_MULTIPLIER_MIN,
      VENDOR_BUY_MULTIPLIER_MAX,
      context
    );
    const sellMultiplier = readNumberInRange(
      shop,
      "sellMultiplier",
      `shop ${id}.sellMultiplier`,
      VENDOR_SELL_MULTIPLIER_MIN,
      VENDOR_SELL_MULTIPLIER_MAX,
      context
    );
    if (buyMultiplier !== undefined && sellMultiplier !== undefined && sellMultiplier <= buyMultiplier) {
      context.errors.push(`shop ${id}.sellMultiplier must be greater than buyMultiplier.`);
    }
  }
}

function validateContracts(
  contracts: Map<string, ContentRecord>,
  collections: ManifestCollections,
  context: ValidationContext
): void {
  for (const [id, contract] of contracts) {
    validateReference(
      readString(contract, "requesterNpcId", `contract ${id}.requesterNpcId`, context),
      collections.residents,
      `contract ${id}.requesterNpcId`,
      context
    );
    validateLocalizedText(contract["title"], `contract ${id}.title`, context);
    validateLocalizedText(contract["description"], `contract ${id}.description`, context);
    validateContractObjective(contract["objective"], `contract ${id}.objective`, collections, context);
    validateContractReward(contract["reward"], `contract ${id}.reward`, collections, context);
    readIntegerInRange(contract, "deadlineDays", `contract ${id}.deadlineDays`, 1, 30, context);
    readIntegerInRange(contract, "repeatCooldownDays", `contract ${id}.repeatCooldownDays`, 0, 60, context);
    validateReference(
      readString(contract, "memoryFlagId", `contract ${id}.memoryFlagId`, context),
      collections.flags,
      `contract ${id}.memoryFlagId`,
      context
    );
  }
}

function validateContractObjective(
  value: unknown,
  path: string,
  collections: ManifestCollections,
  context: ValidationContext
): void {
  if (!isRecord(value)) {
    context.errors.push(`${path} must be an object.`);
    return;
  }

  const type = readString(value, "type", `${path}.type`, context);
  if (type !== undefined) {
    validateEnum(type, CONTRACT_OBJECTIVE_TYPES, `${path}.type`, context);
  }

  if (type === "fetchItem" || type === "deliverItem" || type === "growCrop" || type === "gatherZone") {
    validateReference(readString(value, "itemId", `${path}.itemId`, context), collections.items, `${path}.itemId`, context);
    readIntegerInRange(value, "quantity", `${path}.quantity`, 1, 999, context);
  }

  if (type === "craftItem") {
    validateReference(
      readString(value, "recipeId", `${path}.recipeId`, context),
      collections.recipes,
      `${path}.recipeId`,
      context
    );
    readIntegerInRange(value, "quantity", `${path}.quantity`, 1, 999, context);
  }

  if (type === "visitLocation") {
    validateReference(
      readString(value, "locationId", `${path}.locationId`, context),
      collections.locations,
      `${path}.locationId`,
      context
    );
  }

  if (type === "gatherZone") {
    validateReference(readString(value, "zoneId", `${path}.zoneId`, context), collections.zones, `${path}.zoneId`, context);
  }
}

function validateContractReward(
  value: unknown,
  path: string,
  collections: ManifestCollections,
  context: ValidationContext
): void {
  if (!isRecord(value)) {
    context.errors.push(`${path} must be an object.`);
    return;
  }

  readIntegerInRange(
    value,
    "currency",
    `${path}.currency`,
    CONTRACT_REWARD_CURRENCY_MIN,
    CONTRACT_REWARD_CURRENCY_MAX,
    context
  );

  if (value["affinity"] !== undefined) {
    readIntegerInRange(value, "affinity", `${path}.affinity`, 0, CONTRACT_REWARD_AFFINITY_MAX, context);
  }

  if (value["items"] !== undefined) {
    validateItemQuantities(value["items"], `${path}.items`, collections.items, context);
  }
}

function validateZones(
  zones: Map<string, ContentRecord>,
  collections: ManifestCollections,
  context: ValidationContext
): void {
  for (const [id, zone] of zones) {
    validateLocalizedText(zone["displayName"], `zone ${id}.displayName`, context);
    validateReference(
      readString(zone, "locationId", `zone ${id}.locationId`, context),
      collections.locations,
      `zone ${id}.locationId`,
      context
    );
    readIntegerInRange(zone, "dailyActionLimit", `zone ${id}.dailyActionLimit`, 1, 100, context);

    const actions = readArray(zone, "actions", `zone ${id}.actions`, context, { allowEmpty: false });
    const actionIds = new Set<string>();
    for (const [index, actionValue] of actions.entries()) {
      const path = `zone ${id}.actions[${index}]`;
      if (!isRecord(actionValue)) {
        context.errors.push(`${path} must be an object.`);
        continue;
      }

      const actionId = readContentId(actionValue, path, "zone action", context);
      if (actionId !== undefined) {
        if (actionIds.has(actionId)) {
          context.errors.push(`Duplicate zone action id: ${actionId}.`);
        }

        actionIds.add(actionId);
      }
      validateLocalizedText(actionValue["displayName"], `${path}.displayName`, context);
      readIntegerInRange(actionValue, "energyCost", `${path}.energyCost`, 1, 100, context);
      validateZoneRewards(actionValue["rewards"], `${path}.rewards`, collections, context);
      validateReferences(
        readStringArray(actionValue, "requiredFlagIds", `${path}.requiredFlagIds`, context),
        collections.flags,
        `${path}.requiredFlagIds`,
        context
      );
    }
  }
}

function validateZoneRewards(
  value: unknown,
  path: string,
  collections: ManifestCollections,
  context: ValidationContext
): void {
  const rewards = readArrayValue(value, path, context, { allowEmpty: false });
  for (const [index, rewardValue] of rewards.entries()) {
    const rewardPath = `${path}[${index}]`;
    if (!isRecord(rewardValue)) {
      context.errors.push(`${rewardPath} must be an object.`);
      continue;
    }

    validateReference(
      readString(rewardValue, "itemId", `${rewardPath}.itemId`, context),
      collections.items,
      `${rewardPath}.itemId`,
      context
    );
    const minQuantity = readIntegerInRange(rewardValue, "minQuantity", `${rewardPath}.minQuantity`, 1, 999, context);
    const maxQuantity = readIntegerInRange(rewardValue, "maxQuantity", `${rewardPath}.maxQuantity`, 1, 999, context);
    if (minQuantity !== undefined && maxQuantity !== undefined && maxQuantity < minQuantity) {
      context.errors.push(`${rewardPath}.maxQuantity must be greater than or equal to minQuantity.`);
    }
    readIntegerInRange(rewardValue, "weight", `${rewardPath}.weight`, 1, 100000, context);
  }
}

function validateDecor(
  decor: Map<string, ContentRecord>,
  collections: ManifestCollections,
  context: ValidationContext
): void {
  for (const [id, decorItem] of decor) {
    validateLocalizedText(decorItem["displayName"], `decor ${id}.displayName`, context);
    validateReference(
      readString(decorItem, "itemId", `decor ${id}.itemId`, context),
      collections.items,
      `decor ${id}.itemId`,
      context
    );
    readString(decorItem, "category", `decor ${id}.category`, context);
    const size = readRecord(decorItem, "size", `decor ${id}.size`, context);
    if (size !== undefined) {
      readIntegerInRange(size, "width", `decor ${id}.size.width`, 1, 10, context);
      readIntegerInRange(size, "height", `decor ${id}.size.height`, 1, 10, context);
    }
    readBoolean(decorItem, "supportsRotation", `decor ${id}.supportsRotation`, context);
    validateEnum(decorItem["placement"], DECOR_PLACEMENTS, `decor ${id}.placement`, context);
  }
}

function validateStoryEvents(
  storyEvents: Map<string, ContentRecord>,
  collections: ManifestCollections,
  context: ValidationContext
): void {
  for (const [id, storyEvent] of storyEvents) {
    validateLocalizedText(storyEvent["title"], `story event ${id}.title`, context);
    validateLocalizedText(storyEvent["summary"], `story event ${id}.summary`, context);
    validateReferences(
      readStringArray(storyEvent, "triggerFlagIds", `story event ${id}.triggerFlagIds`, context),
      collections.flags,
      `story event ${id}.triggerFlagIds`,
      context
    );
    validateReferences(
      readStringArray(storyEvent, "setsFlagIds", `story event ${id}.setsFlagIds`, context, {
        allowMissing: false,
        allowEmpty: false
      }),
      collections.flags,
      `story event ${id}.setsFlagIds`,
      context
    );
    validateReferences(
      readStringArray(storyEvent, "participantNpcIds", `story event ${id}.participantNpcIds`, context),
      collections.residents,
      `story event ${id}.participantNpcIds`,
      context
    );
    validateReferences(
      readStringArray(storyEvent, "dialogueLineIds", `story event ${id}.dialogueLineIds`, context),
      collections.dialogue,
      `story event ${id}.dialogueLineIds`,
      context
    );
  }
}

function validateItemQuantities(
  value: unknown,
  path: string,
  itemIds: Map<string, ContentRecord>,
  context: ValidationContext,
  options: { readonly allowEmpty?: boolean } = {}
): void {
  const itemQuantities = readArrayValue(value, path, context, { allowEmpty: options.allowEmpty ?? true });
  for (const [index, itemQuantityValue] of itemQuantities.entries()) {
    const itemQuantityPath = `${path}[${index}]`;
    if (!isRecord(itemQuantityValue)) {
      context.errors.push(`${itemQuantityPath} must be an object.`);
      continue;
    }

    validateReference(
      readString(itemQuantityValue, "itemId", `${itemQuantityPath}.itemId`, context),
      itemIds,
      `${itemQuantityPath}.itemId`,
      context
    );
    readIntegerInRange(itemQuantityValue, "quantity", `${itemQuantityPath}.quantity`, 1, 999, context);
  }
}

function validateLocalizedText(value: unknown, path: string, context: ValidationContext): void {
  if (!isRecord(value)) {
    context.errors.push(`${path} must be a localized text object.`);
    return;
  }

  const key = readString(value, "key", `${path}.key`, context);
  const text = readString(value, "text", `${path}.text`, context);

  if (key !== undefined) {
    if (context.localizedKeys.has(key)) {
      context.errors.push(`Duplicate localized text key: ${key}.`);
    }

    context.localizedKeys.add(key);
  }

  if (text !== undefined) {
    if (PLACEHOLDER_TEXT_PATTERN.test(text) || /^npc\s*\d*$/iu.test(text.trim())) {
      context.errors.push(`${path}.text contains placeholder player-facing text.`);
    }
  }
}

function validateReference(
  id: string | undefined,
  validIds: ReadonlyMap<string, unknown> | ReadonlySet<string>,
  path: string,
  context: ValidationContext
): void {
  if (id === undefined) {
    return;
  }

  if (!validIds.has(id)) {
    context.errors.push(`${path} references unknown id: ${id}.`);
  }
}

function validateReferences(
  ids: readonly string[],
  validIds: ReadonlyMap<string, unknown> | ReadonlySet<string>,
  path: string,
  context: ValidationContext
): void {
  for (const id of ids) {
    validateReference(id, validIds, path, context);
  }
}

function validateEnum(value: unknown, allowedValues: ReadonlySet<string>, path: string, context: ValidationContext): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    context.errors.push(`${path} must be a non-empty string.`);
    return;
  }

  if (!allowedValues.has(value)) {
    context.errors.push(`${path} must be one of ${[...allowedValues].join(", ")}.`);
  }
}

function buildCollectionMap(
  values: readonly unknown[],
  collectionName: string,
  context: ValidationContext
): Map<string, ContentRecord> {
  const ids = new Map<string, ContentRecord>();

  for (const [index, value] of values.entries()) {
    const path = `${collectionName}[${index}]`;
    if (!isRecord(value)) {
      context.errors.push(`${path} must be an object.`);
      continue;
    }

    const id = readContentId(value, path, collectionName, context);
    if (id === undefined) {
      continue;
    }

    if (ids.has(id)) {
      context.errors.push(`Duplicate ${collectionName} id: ${id}.`);
      continue;
    }

    ids.set(id, value);
  }

  return ids;
}

function readContentId(
  value: ContentRecord,
  path: string,
  collectionName: string,
  context: ValidationContext
): string | undefined {
  const id = readString(value, "id", `${path}.id`, context);
  if (id === undefined) {
    return undefined;
  }

  if (!CONTENT_ID_PATTERN.test(id)) {
    context.errors.push(`${collectionName} id must match ${CONTENT_ID_PATTERN.toString()}: ${id}.`);
  }

  return id;
}

function requireMinimum(
  values: ReadonlyMap<string, unknown>,
  minimum: number,
  collectionName: string,
  context: ValidationContext
): void {
  if (values.size < minimum) {
    context.errors.push(`At least ${minimum} ${collectionName} are required for v0.1.`);
  }
}

function readRecord(
  value: ContentRecord,
  key: string,
  path: string,
  context: ValidationContext
): ContentRecord | undefined {
  const child = value[key];
  if (!isRecord(child)) {
    context.errors.push(`${path} must be an object.`);
    return undefined;
  }

  return child;
}

function readArray(
  value: ContentRecord,
  key: string,
  path: string,
  context: ValidationContext,
  options: { readonly allowEmpty?: boolean } = {}
): readonly unknown[] {
  return readArrayValue(value[key], path, context, options);
}

function readArrayValue(
  value: unknown,
  path: string,
  context: ValidationContext,
  options: { readonly allowEmpty?: boolean } = {}
): readonly unknown[] {
  if (!Array.isArray(value)) {
    context.errors.push(`${path} must be an array.`);
    return [];
  }

  if (options.allowEmpty === false && value.length === 0) {
    context.errors.push(`${path} must not be empty.`);
  }

  return value;
}

function readString(value: ContentRecord, key: string, path: string, context: ValidationContext): string | undefined {
  const child = value[key];
  if (typeof child !== "string" || child.trim().length === 0) {
    context.errors.push(`${path} must be a non-empty string.`);
    return undefined;
  }

  return child;
}

function readOptionalString(
  value: ContentRecord,
  key: string,
  path: string,
  context: ValidationContext
): string | undefined {
  if (value[key] === undefined) {
    return undefined;
  }

  return readString(value, key, path, context);
}

function readStringArray(
  value: ContentRecord,
  key: string,
  path: string,
  context: ValidationContext,
  options: { readonly allowMissing?: boolean; readonly allowEmpty?: boolean } = {}
): readonly string[] {
  if (value[key] === undefined) {
    if (options.allowMissing === false) {
      context.errors.push(`${path} must be an array.`);
    }

    return [];
  }

  const arrayOptions =
    options.allowEmpty === undefined
      ? {}
      : {
          allowEmpty: options.allowEmpty
        };
  const children = readArray(value, key, path, context, arrayOptions);
  const strings: string[] = [];

  for (const [index, child] of children.entries()) {
    if (typeof child !== "string" || child.trim().length === 0) {
      context.errors.push(`${path}[${index}] must be a non-empty string.`);
      continue;
    }

    strings.push(child);
  }

  return strings;
}

function readIntegerInRange(
  value: ContentRecord,
  key: string,
  path: string,
  min: number,
  max: number,
  context: ValidationContext
): number | undefined {
  const child = value[key];
  if (typeof child !== "number" || !Number.isInteger(child)) {
    context.errors.push(`${path} must be an integer.`);
    return undefined;
  }

  if (child < min || child > max) {
    context.errors.push(`${path} must be between ${min} and ${max}.`);
    return undefined;
  }

  return child;
}

function readNumberInRange(
  value: ContentRecord,
  key: string,
  path: string,
  min: number,
  max: number,
  context: ValidationContext
): number | undefined {
  const child = value[key];
  if (typeof child !== "number" || !Number.isFinite(child)) {
    context.errors.push(`${path} must be a finite number.`);
    return undefined;
  }

  if (child < min || child > max) {
    context.errors.push(`${path} must be between ${min} and ${max}.`);
    return undefined;
  }

  return child;
}

function readBoolean(value: ContentRecord, key: string, path: string, context: ValidationContext): boolean | undefined {
  const child = value[key];
  if (typeof child !== "boolean") {
    context.errors.push(`${path} must be a boolean.`);
    return undefined;
  }

  return child;
}

function isRecord(value: unknown): value is ContentRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
