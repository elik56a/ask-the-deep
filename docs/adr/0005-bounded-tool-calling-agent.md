# 0005. Bounded tool-calling agent

Date: 2026-10-19 · Status: accepted · Supersedes [0001](0001-fixed-pipeline.md)

## Context

ADR 0001 fixed the order of steps: search once, gate, answer once. A real-world assistant decides for itself what to look up: it searches once per part of a multi-part question, browses projects, or checks live data. The site should show that kind of agent, without giving up honest answers, low cost or the transparency panel.

## Decision

After the guardrails, a Pydantic AI agent runs with five tools: `search_knowledge`, `list_projects`, `get_project`, `github_activity` and `contact_info`. The model chooses which to call and with what input. Code keeps control in four ways:

- **Limits:** `AGENT_MAX_REQUESTS` model calls and `AGENT_MAX_TOOL_CALLS` tool calls per question (default 4 each).
- **The gate lives in the search tool:** passages below `RETRIEVAL_THRESHOLD` never reach the model.
- **A structured, checked answer:** `kind` (answered / no_information / smalltalk), `citations`, `text`. Citations must be ids a tool returned in this run, and "answered" needs at least one tool result. A failed check gets one retry, then the visitor sees "I don't have that information".
- **No hidden steps:** every tool call and result becomes a `tool.called` / `tool.completed` event, and searches also emit `retrieval.*`. An invalid attempt is never streamed, because citations come before text in the schema.

## Consequences

- Multi-part and browsing questions work; greetings no longer trigger a search.
- Up to 4 model calls per question instead of 1. Cost and latency are higher, but still bounded.
- The model can no longer be skipped entirely when nothing matches; the threshold now limits what it sees rather than whether it runs.
- Evals must also check the tool trajectory (did it call the expected tools), not only the answer.
- `github_activity` is the only network call outside the model and the database. It is cached for 10 minutes and fails soft.
