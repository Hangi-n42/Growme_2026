# Action System Spec

## Purpose

Define gathering and action-zone interactions outside the farm.

## Requirements

- Fixed v0.1 zones include at least a meadow/forest edge style zone and a mine.
- Zones expose deterministic actions such as forage, chop, collect fiber, gather stone, or mine rock.
- Actions consume energy and return rewards from seeded loot tables.
- Zones have daily charges or depletion state reset by sleep.
- Rare drops must be deterministic under seeded RNG.

## Non-Goals

- No physics-based harvesting.
- No real-time respawn timers.
- No large procedural maps in v0.1.
- No combat in v0.1.

## Acceptance Criteria

- Each zone provides at least one useful output for farming, crafting, contracts, or economy.
- Depleted zones reject further gathering until the next day.
- Invalid zone or action IDs fail transactionally.

## Tests and Gates

- `pnpm test:unit`
- `pnpm test:sim`
- Loot table determinism and depletion reset tests.
