# Quality Eval Spec

## Purpose

Define automated and review-based quality evaluation for the autonomous workflow.

## Required Areas

- Determinism: same seed and commands produce identical state and event log.
- Economy integrity: no infinite money loop, no deadlock, no invalid negative values, no item duplication.
- Boundary integrity: Phaser does not own gameplay rules.
- Scope integrity: no multiplayer v0.1 requirement and no runtime LLM NPC dialogue.
- Player loop: first three days prove farm, craft, gather/action, trade, contract, relationship, decoration, save, and reload.
- Stability: no crash, blank screen, unhandled promise rejection, failed asset load, or persistent console error in smoke path.
- Visual readiness: no core gameplay placeholder rectangles in release candidate.

## Non-Goals

- No subjective score replaces pass/fail release gates.
- No gate is waived silently.

## Acceptance Criteria

- Quality eval returns pass/fail with named failing gates.
- Any threshold change is detected by `pnpm check:no-quality-threshold-lowering`.
- Release manager can use eval output directly in the release checklist.

## Tests and Gates

- `pnpm eval:quality`
- `pnpm check:no-quality-threshold-lowering`
- `pnpm check:protected-files`
