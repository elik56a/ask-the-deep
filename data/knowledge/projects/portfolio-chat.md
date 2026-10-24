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

## Tech stack of the portfolio chat agent

The chat agent's backend is Python with FastAPI and Pydantic AI, with strict mypy typing and pytest. Passages and their embeddings live in PostgreSQL with pgvector. The frontend is TypeScript with TanStack Start, prerendered as a static site, and the sea dive is drawn with three.js. The server streams its steps to the browser with server-sent events. Infrastructure runs on pay-per-use AWS services and is defined in Terraform.

## How the portfolio chat agent is evaluated

Eliyahu tests the chat agent with a hand-written set of evaluation questions in English and Hebrew. The set includes questions the knowledge base answers, trap questions that sound answerable but are not, off-topic questions and prompt injections. A judge model checks that each answer states the required facts, avoids forbidden claims and cites the right passages. A separate retrieval evaluation measures whether search finds the right passages, and the relevance threshold was set from those measured scores. Every change to the model, the prompt or the knowledge base comes with an evaluation run.

## Cost and safety in the portfolio chat agent

The chat agent has hard spending limits: a monthly budget of 5 US dollars, a daily budget and a smaller budget per visitor, all counted at list prices. The agent loop is capped in model requests and tool calls, and questions and history are limited in length. Conversation text is never stored, not in logs, traces or the database. Secrets live in environment variables and AWS SSM, never in the code.

## Languages of the portfolio chat agent

The chat agent answers in English or Hebrew, in the language of the question. The knowledge base is written in English, and the agent translates what it finds when a visitor asks in Hebrew.

## Design decisions in the portfolio chat agent

Eliyahu records each design decision of the chat agent as a short architecture decision record (ADR). Examples include a bounded tool-calling agent instead of a free-running one, the passage size, the retrieval threshold, a budget of 5 dollars a month, keeping session history in the browser instead of on the server, and a "glass box" interface that shows every step instead of hiding them.
