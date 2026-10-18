# 0006. Model prices from genai-prices, not a pricing file

Date: 2026-10-19 · Status: accepted

## Context

The spec asks for versioned pricing files, so that each answer's cost can be computed. Pydantic AI already depends on `genai-prices`, a maintained price table for every major provider, which includes cached-token discounts and price changes over time.

## Decision

Cost comes from `ModelResponse.cost()` (genai-prices). Each model response is priced by the model that produced it, so runs that fall back to the backup model are priced correctly. Models with no price (the offline test model) count as free. Prices are list prices: free-tier calls show what they would cost on the paid tier, which is the safe number for the budget cap.

## Consequences

- No price table to maintain by hand.
- Prices change when the `pydantic-ai-slim` / `genai-prices` version is bumped. That happens in a reviewed lockfile change, which is our versioning.
- If a model is missing from genai-prices, its cost shows as 0. Check that the production model is priced before launch (P5.16).
