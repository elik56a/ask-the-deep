---
title: Portfolio chat agent
type: project
role: Author
technologies: [Python, FastAPI, Pydantic AI, Postgres, pgvector, TypeScript, TanStack Start, three.js, AWS, Terraform]
language: en
visibility: public
---

# Portfolio chat agent

## What the portfolio chat agent is

This portfolio site has a chat agent, built by Eliyahu, that answers questions about him from verified passages only. Every answer cites its sources, and when the knowledge base has no answer, the agent says so instead of guessing.

## How the portfolio chat agent works

Every question first passes guardrails. Then an AI agent decides which tools to call: it searches the knowledge base, looks up projects or recent GitHub activity, and can loop with more searches before it answers. Hybrid retrieval (vector search plus keyword search) finds passages, and passages below a relevance threshold never reach the model. Every cited source is checked against what the tools actually returned in that run. An answer that fails the check is retried once, then replaced by "I don't have that information".

## Watching the agent work

Each step the server takes streams to the browser as a real event: guardrail checks, every model call with its tokens, cost and time, every tool call with its inputs, and the retrieval scores against the threshold. The site shows this as a dive: each step takes the page one level deeper into the sea, extra agent loops go deeper still, and the run ends at the seabed with a dive profile and a receipt.

## Why Eliyahu built the portfolio chat agent

Eliyahu built this agent to show how he builds AI systems the way they are built in production: retrieval with measurable hallucination prevention, cost caps, security and observability. It is also his path deeper into Python and AI engineering.
