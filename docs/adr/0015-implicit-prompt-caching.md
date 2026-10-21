# 0015. Prompt caching: Gemini's implicit cache, no explicit cache

Date: 2026-10-21 · Status: accepted

## Context

P3.6 asks for prompt caching of the system prompt and the fixed instructions. Gemini offers two kinds ([docs](https://ai.google.dev/gemini-api/docs/caching), checked 2026-10-21):

- **Implicit caching** is on by default for Gemini 2.5 and newer. Requests that start with the same prefix within a short time get a discount on the cached part, with no code and no storage fee. It applies only above a minimum prompt size: 2,048 tokens on 2.5 Flash and 4,096 on the 3.x models listed (Flash-Lite isn't listed).
- **Explicit caching** creates a stored cache object that is paid by the hour and has the same kind of minimum.

Our fixed prefix is small. The first model call sends about 740 input tokens (prompt v3 plus the tool definitions). Later calls in the agent loop grow to about 2,700 tokens by call 4, because they carry the tool results.

## Decision

- No explicit cache. The fixed prefix is far below the minimum, and an hourly storage fee would cost more than the tokens it saves on a site with little traffic.
- Keep the prompt shaped for the implicit cache: instructions and tool definitions first and unchanged between requests (no dates or per-request values in them), then the conversation history, then the question.
- Report what the cache actually did: `usage.reported.cached_tokens` comes from the provider's usage, and `generation.started.prompt_cache_hit` is now true when the run had cached tokens (it was always false). Cached tokens are priced at the discounted rate by genai-prices (ADR 0006).

## Consequences

- Most requests show 0 cached tokens, because they are below the minimum. That is expected, not a bug.
- If the prompt or the corpus context grows past the minimum (for example with longer instructions or a bigger default context), the implicit cache starts working with no change here.
- Revisit if traffic grows enough that an explicit cache's storage fee is cheaper than the repeated input tokens.
