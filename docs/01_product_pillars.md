# Product Pillars

## v0.1 Priority Order

When scope or sequencing is unclear, v0.1 work should prioritize:

1. Deterministic `packages/sim-core` commands, content validation, and save/load integrity.
2. The first-three-days proof path: farm, craft, action/gather, trade, contract, relationship, decoration, save, reload, and day progression.
3. NPC economy content that supports the proof path without exploits or progression deadlocks.
4. Phaser presentation that renders sim-core state and dispatches commands without owning gameplay rules.

## Cozy Competence

The player should feel capable, calm, and useful. Action exists to make effort satisfying, not punitive.

Requirements:

- Every normal day offers at least one productive action.
- Failure states are soft: missed margins, delayed rewards, or lower relationship gains.
- Requests explain what is needed, who needs it, and where the player can make progress.

Non-goals:

- Survival pressure.
- Punitive debt, hunger, decay, or permanent loss in v0.1.
- Combat-heavy progression.

## Legible Local Economy

The economy must be understandable enough to plan around and deep enough to optimize.

Requirements:

- NPC shops have deterministic stock, budgets, accepted categories, and restocks.
- Prices are bounded and explainable from authored data plus local state.
- Player actions visibly affect inventory, money, relationship, contracts, or village progress.

Non-goals:

- Global market simulation.
- Loans, banking, auctions, or speculative trading.
- Positive zero-risk arbitrage loops.

## Authored Resident Life

NPCs are residents, not static vendors.

Requirements:

- At least 5 v0.1 residents have distinct schedules, jobs, preferences, requests, relationship hooks, and memory flags.
- Dialogue is selected from authored tables by deterministic priority.
- Story events and relationship milestones set persistent flags.

Non-goals:

- Runtime generated biographies.
- Runtime LLM dialogue.
- Romance or irreversible branching story in v0.1.

## Deterministic Sandbox Core

The simulation must be testable without Phaser or the DOM.

Requirements:

- Sim-core owns authoritative state, command validation, seeded randomness, economy math, NPC rules, save shape, and event output.
- Same seed plus same command log produces the same final state and event log.
- Failed commands are transactional and leave state unchanged except for failure events.

Non-goals:

- Gameplay mutation inside Phaser scenes.
- Wall-clock or network-dependent simulation.
- Unseeded `Math.random()` in sim-core.

## Original Village Identity

The game must build its own look, tone, names, symbols, and economy language.

Requirements:

- Content reviews check for borrowed names, recognizable layouts, copied item sets, and exact economy symbols.
- Placeholder visuals are acceptable during development but not in release-candidate core gameplay.
- Release candidate must have 0 core gameplay placeholder rectangles.

Non-goals:

- Cloning existing games' UI layouts, item identities, character roles, or progression symbols.
