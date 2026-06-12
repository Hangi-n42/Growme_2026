# Contracts Spec

## Purpose

Define NPC requests and repeatable economy contracts.

## Requirements

- Each contract defines requester, trigger, objective, deadline, reward, failure behavior, repeat cooldown, and memory flag output.
- Objective types include fetch item, deliver item, grow crop, craft/repair, visit location, and gather/action.
- Rewards are calculated from required effort/value plus a bounded margin.
- Failed or expired requests are non-destructive and may reappear after cooldown.
- Limit active NPC requests to 3 at once for v0.1.

## Non-Goals

- No irreversible failure chains.
- No hidden required objectives.
- No reward table that bypasses economy invariants.

## Acceptance Criteria

- Every v0.1 request is reachable from available resources, shops, recipes, or fallback sources.
- Repeatable contracts cannot be spammed for uncapped profit.
- Completion awards currency, items, relationship, flags, or village progress exactly once.

## Tests and Gates

- `pnpm test:economy`
- `pnpm test:npc`
- Contract profitability route search.
- Save/load preserves active and completed contract state.
