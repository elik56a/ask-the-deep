# 0017. The last model call must answer; prompt v5

Date: 2026-10-21 · Status: accepted

## Context

The first full eval run (P4.2, golden set of 49 cases, prompt v4) scored 33/49. Ten answerable questions ended in "I don't have that information" after 4 model calls. In a live trace of "What is Eliyahu's current role?", the first search already returned `experience/phytech.md#roles-at-phytech`, but the model kept searching with new queries until `AGENT_MAX_REQUESTS` (4) stopped it, and the pipeline replaced the missing answer with "no information". The prompt already says to answer as soon as the passages cover the question; Flash-Lite doesn't follow it reliably.

The same run showed a prompt conflict: "How does this chat agent avoid making things up?" was treated as `smalltalk` ("a question about you as an assistant"), although the portfolio-chat project passages answer it.

## Decision

- **On the last allowed model call, the agent's tools are hidden** (a Pydantic AI `PrepareTools` capability on `run_step >= AGENT_MAX_REQUESTS`). The answer tool stays, so the model must answer from what it has already found, or reply `no_information`. The citation check still applies.
- **Prompt v5** (`answer_v5.md`, `RULES_VERSION=v5`): `smalltalk` is a greeting, a thank-you or "who are you"; how this chat agent works or why it was built is one of Eliyahu's projects and gets searched.

## Consequences

| Run | Score | Notes |
|---|---|---|
| v4 | 33/49 | 10 answerable cases lost to the request limit; 3 judge calls hit the free-tier rate limit |
| v5 + last-call rule | 41/49 | 6 cases hit the free-tier quota (errors, not answers); 2 real failures |
| v5, re-run of those 8 | 8/8 | the 2 real failures (`en-before-phytech`, `he-trap-team-size`) are flaky, not fixed |

- Answerable questions went from 13/25 to 24/25 (25/25 with the re-run).
- A run that reaches the limit now costs no more than before (still at most 4 calls), but ends with an answer instead of a fallback.
- Flaky cases remain; P4.8 sets targets after more runs, and a full run on the free tier (15 requests a minute) takes about 30 minutes.
