# NPC Economy Spec

## Purpose

Define shops, prices, stock, budgets, and economy safety.

## Requirements

- Use one soft currency for v0.1.
- Every tradable item defines base price, category, rarity, stack limit, and vendor buy/sell eligibility.
- Shops define stock caps, restock interval, accepted categories, daily cash budget, and buy/sell multipliers.
- Default vendor buy price is 35 percent to 60 percent of base price.
- Default vendor sell price is 100 percent to 150 percent of base price.
- Dynamic pricing is clamped from 0.65x to 1.75x base price.
- Vendor sell price must always exceed vendor buy price after modifiers.
- Critical progression goods must have guaranteed fallback availability.

## Non-Goals

- No loans, banking, interest, auctions, or player-run shops.
- No real-time global market.
- No speculative commodity trading.

## Acceptance Criteria

- No same-day buy/sell route produces positive zero-risk profit.
- Shops do not permanently run out of critical goods or cash.
- At least three viable earning paths exist after day 7.

## Tests and Gates

- `pnpm test:economy`
- `pnpm sim:7days`
- `pnpm sim:30days`
- Infinite money loop count: 0.
- Progression deadlock count: 0.
