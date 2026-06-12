export const CONTENT_SCHEMA_VERSION = 1;
export const REQUIRED_V0_1_RESIDENT_COUNT = 5;

export interface ContentReference {
  readonly id: string;
  readonly displayName: string;
}

export interface ResidentContent extends ContentReference {
  readonly job: string;
  readonly homeLocationId: string;
  readonly preferenceTags: readonly string[];
  readonly requestHookIds: readonly string[];
  readonly relationshipHookIds: readonly string[];
}

export interface ContentManifest {
  readonly schemaVersion: typeof CONTENT_SCHEMA_VERSION;
  readonly residents: readonly ResidentContent[];
}

export function validateContentManifest(manifest: ContentManifest): readonly string[] {
  const errors: string[] = [];
  const residentIds = new Set<string>();

  if (manifest.schemaVersion !== CONTENT_SCHEMA_VERSION) {
    errors.push(`Unsupported content schema version: ${manifest.schemaVersion}`);
  }

  if (manifest.residents.length < REQUIRED_V0_1_RESIDENT_COUNT) {
    errors.push(`At least ${REQUIRED_V0_1_RESIDENT_COUNT} residents are required for v0.1.`);
  }

  for (const resident of manifest.residents) {
    if (residentIds.has(resident.id)) {
      errors.push(`Duplicate resident id: ${resident.id}`);
    }

    residentIds.add(resident.id);

    if (resident.displayName.trim().length === 0) {
      errors.push(`Resident ${resident.id} is missing a display name.`);
    }
  }

  return errors;
}
