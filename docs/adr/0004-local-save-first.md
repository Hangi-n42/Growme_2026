# ADR 0004: Local Save First

## Status

Accepted

## Context

v0.1 is solo-first and does not need accounts, cloud sync, or server authority.

## Decision

Implement local save first with versioned snapshots and migration tests.

Save data must include:

- Day and time.
- Player energy, wallet, inventory, and location.
- Farm state.
- Mine state.
- NPC relationships, schedules state, request state, memory flags, and story flags.
- Shop inventories and budgets.
- Home/farm decoration layout.
- Content version and save schema version.

## Consequences

- Browser reload must restore playable state.
- Corrupted or incompatible saves fail gracefully.
- Cloud save is out of scope for v0.1.
