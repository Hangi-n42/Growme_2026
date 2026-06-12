# Home Decoration Spec

## Purpose

Define v0.1 home and farm decoration rules.

## Requirements

- Home/farm decoration layout is owned by sim-core.
- Furniture data defines item ID, size, category, rotation support, footprint, and placement rules.
- Commands include place, move, rotate, and remove.
- Placement validates bounds, collisions, blocked cells, and ownership.
- Removing decor returns the item to inventory unless it is part of a move transaction.

## Non-Goals

- No wall-mounted objects in v0.1.
- No advanced layering.
- No lighting changes.
- No physics placement.
- No shared multiplayer homes.

## Acceptance Criteria

- Player can craft or obtain decor and place it.
- Invalid placement does not consume an item.
- Move and rotate cannot duplicate or delete decor.
- Save/load restores layout exactly.

## Tests and Gates

- `pnpm test:unit`
- `pnpm test:save-load`
- Bounds, collision, rotation, and inventory transaction tests.
