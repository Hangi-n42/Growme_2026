# ADR 0003: Data-Driven NPC Content

## Status

Accepted

## Context

NPC residents must provide rich authored interactions while staying deterministic and testable.

## Decision

NPC schedules, dialogue, relationships, memory flags, shops, story events, and requests are authored as validated data.

Dialogue is selected by deterministic priority:

1. Active story.
2. Active request.
3. First meeting.
4. Relationship milestone.
5. Weather or day context.
6. Daily fallback.

## Consequences

- No runtime LLM dialogue in v0.1.
- Content validation must catch missing IDs, empty text, invalid flags, duplicate lines, and unreachable requests.
- Save/load must preserve affinity, request state, memory flags, and completed story events.
