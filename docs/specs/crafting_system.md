# Crafting System Spec

## Purpose

Define deterministic recipe crafting.

## Requirements

- Recipe data lives in sim-core validated content.
- Recipe data defines inputs, outputs, unlock conditions, craft time or instant flag, and category.
- Crafting checks all ingredients, consumes them transactionally, and adds outputs.
- Failed craft leaves state unchanged and emits a failure event.
- Initial v0.1 recipes include storage, basic decor, and a utility/path item.

## Non-Goals

- No timed production chains for v0.1.
- No advanced station adjacency rules.
- No durability.
- No recipe UI logic in sim-core.

## Acceptance Criteria

- Every recipe references valid item IDs.
- No recipe output vendor value exceeds input value plus approved labor margin unless explicitly tested.
- Crafting cannot duplicate or delete items through invalid quantity.

## Tests and Gates

- `pnpm test:unit`
- `pnpm test:economy`
- Recipe validation and ROI checks.
