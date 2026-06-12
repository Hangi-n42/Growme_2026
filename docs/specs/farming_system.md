# Farming System Spec

## Purpose

Define crop and farm-tile simulation.

## Requirements

- Farm grid supports untilled, tilled, planted, watered, ready, and blocked tile states.
- Crop data defines seed item, growth days, sell value, harvest output, watering requirement, and post-harvest tile behavior.
- Commands include till, plant, water, harvest, and clear.
- Watered planted crops advance during sleep/day transition.
- Harvest adds output to inventory exactly once.

## Non-Goals

- No fertilizer.
- No crop quality.
- No seasonal crop death in v0.1.
- No sprinklers.
- No pests.

## Acceptance Criteria

- Planting fails without seed or valid tile.
- Watering consumes energy only on valid planted unwatered tiles.
- Crops do not grow unless watered when watering is required.

## Tests and Gates

- `pnpm test:unit`
- Crop lifecycle tests.
- Invalid command transaction tests.
- Save/load roundtrip for farm grid.
