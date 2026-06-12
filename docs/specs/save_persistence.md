# Save Persistence Spec

## Purpose

Define local save, reload, migration, and roundtrip behavior.

## Requirements

- Use local save first for v0.1.
- Save snapshots are versioned.
- Snapshot includes day, time, seed state, command log pointer, player, inventory, farm, mine, shops, contracts, NPC flags, relationships, story flags, and decoration layout.
- Load validates schema and content version.
- Corrupted or incompatible saves fail gracefully.
- Migrations are required before changing save shape after v0.1 fixtures exist.

## Non-Goals

- No cloud save.
- No account sync.
- No server authority.

## Acceptance Criteria

- Save/load roundtrip returns an equivalent playable state.
- Browser reload resumes from the latest valid save.
- Invalid saves do not crash the client.

## Tests and Gates

- `pnpm test:save-load`
- Browser reload smoke in `pnpm test:first-3-days`.
- Migration fixture tests once save versions exist.
