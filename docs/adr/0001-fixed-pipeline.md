# 0001. Fixed pipeline instead of an autonomous agent

Date: 2026-10-18 · Status: accepted

## Context

The agent answers questions about one person from a small corpus. Every stage must be visible to the visitor as a real event, cost must stay under 0.5 cent per question, and answers must never be guessed.

## Decision

Every request runs the same four stations in order: guardrails, retrieval, decision gate, generation. The model never chooses tools or steps.

## Consequences

- Predictable cost and latency; one model call at most per question.
- Each station maps to exactly one event, so the transparency panel is simple and honest.
- The decision gate can skip the model entirely when nothing relevant is retrieved.
- Multi-step questions may be answered poorly. Revisit only if evals show such questions failing.
