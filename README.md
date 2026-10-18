# Portfolio Chat Agent

A personal portfolio where visitors ask an AI agent about me and get answers grounded only in verified information, while watching every step the system takes to produce each answer.

It's built to production standards: retrieval-augmented generation (RAG) with measurable hallucination prevention, cost caps, security and observability, and a UI that explains rather than overwhelms.

## How it works

After the guardrails, an agent decides which tools to call (search the knowledge base, browse projects, check GitHub, get contact details), then writes an answer. Every tool call streams a real event to the browser:

```
question → guardrails → agent loop ─────────────────────────────→ checked answer + sources
                        model → tool → result → … (max 4 calls)
                                                       │
                                                       └─ no valid answer → "I don't have that information"
```

Code keeps the agent honest: weak passages never reach the model, citations must come from tool results, and limits cap cost ([ADR 0005](docs/adr/0005-bounded-tool-calling-agent.md)).

The event schema in [`api/app/events.py`](api/app/events.py) is the single source of truth; the TypeScript types in `web/` are generated from it.

## Stack

| Layer | Choice |
| --- | --- |
| API | Python 3.12, FastAPI, Pydantic AI, server-sent events |
| Model | Google Gemini (free tier), set by `LLM_MODEL` |
| Retrieval | Postgres + pgvector (Neon), BM25, merged with RRF |
| Web | TanStack Start (static prerender), React, TypeScript |
| Infra | AWS S3 + CloudFront, Lambda with response streaming, DynamoDB, Terraform |
| Quality | Ruff, mypy strict, Biome, pytest, Pydantic Evals, pre-commit |

## Repository

```
api/              FastAPI app, RAG pipeline, tests
web/              TanStack Start site
data/knowledge/   markdown knowledge base (only visibility: public is used)
infra/            Terraform (pay-per-use resources only)
docs/adr/         architecture decision records
```

## Run locally

Requirements: [uv](https://docs.astral.sh/uv/), Node 22 with pnpm, and Docker.

```sh
./scripts/dev.sh
```

This starts Postgres and DynamoDB Local in Docker, the API on http://localhost:8000 and the site on http://localhost:5173 (which proxies `/api` to the API). Ctrl-C stops the API and the site; `docker compose down` stops the databases.

The API runs on the free built-in `"test"` model, so no keys are needed. Ask it a question:

```sh
curl -N -X POST localhost:8000/api/chat \
  -H 'content-type: application/json' \
  -d '{"question": "Which technologies does Eliyahu work with daily?"}'
```

To use a real model, copy `api/.env.example` to `api/.env` and set `GOOGLE_API_KEY`.

## Checks

```sh
cd api && uv run ruff check . && uv run mypy app tests && uv run pytest
cd web && pnpm exec biome check . && pnpm exec tsc --noEmit
```

Pre-commit runs all of them before each commit: `uvx pre-commit install`.

## Docs

- [Task tracker](TASKS.md) — build plan by phase, with status
- [Architecture decisions](docs/adr/)
- [Project conventions](CLAUDE.md)
