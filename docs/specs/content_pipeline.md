# Content Pipeline Spec

## Purpose

Define authored data shape, validation, and content build safety.

## Requirements

- Content includes items, recipes, NPCs, schedules, dialogue, relationships, shops, contracts, zones, decor, story events, and localization-ready strings.
- Validator checks unique IDs, resolved references, non-empty text, valid flags, schedule locations, reward bands, price bounds, recipe references, and release minimums.
- Content changes must be deterministic and versioned.
- Runtime client loads validated manifests only.

## Non-Goals

- No runtime content editor for v0.1.
- No procedural content generation.
- No runtime LLM content.

## Acceptance Criteria

- Invalid references fail with actionable messages.
- v0.1 seed content meets minimum resident, request, shop, and item counts before release candidate.
- Originality review catches copied names, symbols, and layouts.

## Tests and Gates

- `pnpm test:content`
- `pnpm eval:quality`
- Release candidate blocks on content validation failure.
