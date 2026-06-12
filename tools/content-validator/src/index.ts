import {
  loadValidatedContentManifest,
  validateContentManifest,
  type ContentManifest
} from "@growme/content-schema";

export interface ValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

export function validateManifest(manifest: unknown): ValidationResult {
  const errors = validateContentManifest(manifest);

  return {
    ok: errors.length === 0,
    errors
  };
}

export function loadManifest(manifest: unknown): ContentManifest {
  return loadValidatedContentManifest(manifest);
}
