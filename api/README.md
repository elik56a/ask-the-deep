# api

The backend: a FastAPI app that answers one question at a time with a bounded RAG agent and streams every step it takes. Python 3.12, managed with [uv](https://docs.astral.sh/uv/).

For the big picture, see the [root README](../README.md).

## Quick start

```sh
uv sync
cp .env.example .env                                   # optional: real models need GOOGLE_API_KEY
uv run --env-file .env python -m app.rag.ingest        # load data/knowledge into Postgres
uv run --env-file .env uvicorn app.main:app --reload --port 8000
```

With no `.env`, everything runs on Pydantic AI's free `"test"` model and test embeddings, so you can work on the pipeline without any keys. `../scripts/dev.sh` starts Postgres and DynamoDB Local in Docker and runs all of this for you.

## HTTP API

| Route | Body | Returns |
| --- | --- | --- |
| `POST /api/session` | `{ "turnstile_token": "…" }` | `{ "session": "…", "expires_in": 3600 }`: a signed token |
| `POST /api/chat` | `{ "question": "…", "history": [ … ], "session": "…" }` | a stream in the Vercel AI SDK UI message format |
| `GET /api/stats` | | this month's `questions`, `avg_cost_usd`, `avg_latency_ms`, `no_info_rate` |
| `GET /api/health` | | `{ "status": "ok", "corpus_version": "…" }`: which knowledge base is loaded |

`history` is the conversation so far. The browser keeps it and the server stores none of it ([ADR 0007](../docs/adr/0007-session-history-in-the-browser.md)).

## How a question flows

```
main.py          POST /api/chat → hashes the IP, reads the session, calls the pipeline
  pipeline.py    guardrails → agent → decision → citations → usage → finished
    control/     human check, rate limit, spend caps (all three checked in parallel)
    agent/       the model layer: search first, then the tool loop, then a checked answer
      rag/       hybrid retrieval behind the search_knowledge tool
  emitter.py     every step becomes a numbered, timed event → stream + trace + log
  stream.py      events → Vercel AI SDK stream parts
```

Every event goes through `Emitter.emit`, and nothing else writes to the stream. The answer arrives as text parts. Every other event arrives whole as a `data-event` part, so each answer in the browser carries the full record of how it was made.

## Modules

| Path | Role |
| --- | --- |
| [`app/main.py`](app/main.py) | Routes, CORS, origin check (CloudFront's secret header), service wiring |
| [`app/pipeline.py`](app/pipeline.py) | One question end to end: guardrails, the agent run under a deadline, the final events |
| [`app/events.py`](app/events.py) | The event schema: the single source of truth, exported to TypeScript |
| [`app/emitter.py`](app/emitter.py) | Numbers and times events; fans them out to the stream, OpenTelemetry spans and structlog |
| [`app/stream.py`](app/stream.py) | Writes events in the Vercel AI SDK UI message stream format |
| [`app/config.py`](app/config.py) | Every tunable value, read from environment variables |
| [`app/ssm.py`](app/ssm.py) | Loads secrets from SSM Parameter Store at cold start (production) |
| [`app/logs.py`](app/logs.py) | structlog setup: readable locally, JSON in production |
| [`app/tracing.py`](app/tracing.py) | OTLP export to Langfuse, off unless both keys are set |
| [`app/schema_export.py`](app/schema_export.py) | Prints the event JSON Schema for `pnpm gen:events` |
| [`app/trace_gate.py`](app/trace_gate.py) | Gate test: the Langfuse trace has exactly the stages the dive shows |
| **`app/agent/`** | **The model layer. No model calls happen anywhere else.** |
| [`agent/chat_agent.py`](app/agent/chat_agent.py) | The agent loop: search first, tools, limits, structured streaming answer, checks, one retry |
| [`agent/tools.py`](app/agent/tools.py) | `search_knowledge`, `list_projects`, `get_project`, `github_activity`, `contact_info` |
| [`agent/router.py`](app/agent/router.py) | Model fallback chain; a failed model sits out `LLM_COOLDOWN_S` |
| [`agent/github.py`](app/agent/github.py) | Public GitHub repos, cached to stay under the 60 calls/hour anonymous limit |
| [`agent/judge.py`](app/agent/judge.py) | The eval judge (never used by the live site) |
| [`agent/prompts/`](app/agent/prompts/) | Versioned system prompts; `RULES_VERSION` picks one |
| **`app/rag/`** | **Retrieval** |
| [`rag/corpus.py`](app/rag/corpus.py) | Reads `visibility: public` markdown, one passage per `##` section |
| [`rag/embeddings.py`](app/rag/embeddings.py) | Document and query embedders (Gemini, or the test model) |
| [`rag/ingest.py`](app/rag/ingest.py) | Embeds only changed passages, deletes removed ones |
| [`rag/db.py`](app/rag/db.py) | Postgres + pgvector schema and connection pool |
| [`rag/retrieval.py`](app/rag/retrieval.py) | Vector + BM25, fused with RRF, gated at `RETRIEVAL_THRESHOLD` |
| [`rag/recall.py`](app/rag/recall.py) | Recall@k over `evals/retrieval.yaml` |
| **`app/control/`** | **Abuse and cost** |
| [`control/session.py`](app/control/session.py) | Turnstile verification and signed, stateless session tokens |
| [`control/rate_limit.py`](app/control/rate_limit.py) | Per-IP and per-session limit; IPs are salted and hashed |
| [`control/budget.py`](app/control/budget.py) | Month, day and per-visitor spend caps in micro-dollars |
| [`control/counters.py`](app/control/counters.py) | Atomic DynamoDB counters shared by the above |
| [`control/stats.py`](app/control/stats.py) | Aggregate numbers for `/api/stats` |
| **`app/evals/`** | **Answer quality** |
| [`evals/golden.py`](app/evals/golden.py) | Loads and validates the golden cases |
| [`evals/run.py`](app/evals/run.py) | Runs every case through the real pipeline and grades it |

## The agent's guarantees

These are enforced in [`agent/chat_agent.py`](app/agent/chat_agent.py) and [`pipeline.py`](app/pipeline.py), not left to the prompt:

- At most `AGENT_MAX_REQUESTS` (4) model calls and `AGENT_MAX_TOOL_CALLS` (4) tool calls. On the last call the tools are hidden, so the model has to answer.
- A cited passage id that no tool returned in this run is dropped.
- An `answered` reply with no successful tool result is rejected. The model retries once; after that the visitor gets `no_information`.
- The whole request ends within `REQUEST_TIMEOUT_S` (25 s), under Lambda's and CloudFront's 30 s.
- Errors log the exception type and HTTP status only, since provider messages can echo the visitor's words.

## Configuration

Everything lives in [`app/config.py`](app/config.py). Each field is an environment variable of the same name in upper case. The ones you're most likely to touch:

| Variable | Default | What it does |
| --- | --- | --- |
| `LLM_MODEL` | `test` | `provider:model`, e.g. `google:gemini-3.5-flash-lite` |
| `LLM_FALLBACK_MODELS` | `[]` | JSON list of backups, tried in order |
| `LLM_THINKING` | `minimal` | How hard the model thinks before it writes |
| `EMBEDDING_MODEL` | `test` | e.g. `google:gemini-embedding-001` |
| `RETRIEVAL_THRESHOLD` | `0.57` | Cosine similarity a passage needs to reach the model ([ADR 0012](../docs/adr/0012-retrieval-threshold.md)) |
| `RETRIEVAL_TOP_K` | `6` | Passages per search |
| `RULES_VERSION` | `v6` | Which `prompts/answer_v*.md` to use |
| `MAX_INPUT_CHARS` | `500` | Longest question accepted |
| `MAX_HISTORY_MESSAGES` | `20` | Longest conversation accepted |
| `RATE_LIMIT_PER_MINUTE` | `5` | Per IP and per session |
| `MONTHLY_BUDGET_USD` / `DAILY_BUDGET_USD` / `VISITOR_DAILY_BUDGET_USD` | `5` / `0.5` / `0.05` | Spend caps |
| `DATABASE_URL` | local Docker Postgres | pgvector database |
| `DYNAMODB_TABLE` | unset | Counters table; unset turns off the rate limit and spend caps (tests, offline dev) |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` | unset | Turn tracing on |

In production, secrets come from SSM under `/portfolio-chat/<env>/`, never from the repo ([ADR 0014](../docs/adr/0014-secrets-per-environment.md)).

## Tests and checks

```sh
uv run ruff format . && uv run ruff check . && uv run mypy app tests && uv run pytest
```

- mypy runs in strict mode, with no `Any`.
- Tests never call a paid API: they use `TestModel`, the `"test"` model and fakes in [`tests/fakes.py`](tests/fakes.py). Tests that need Postgres use the Docker database.
- [`tests/test_privacy.py`](tests/test_privacy.py) checks that the visitor's words never reach logs or traces.

## Evals

Run them after any change to the model, the prompt or the corpus. They make real model calls.

```sh
uv run --env-file .env python -m app.evals.run --quick       # 8 cases, about 4 minutes
uv run --env-file .env python -m app.evals.run               # all 49 golden cases
uv run --env-file .env python -m app.evals.run --type trap   # one case type
uv run --env-file .env python -m app.rag.recall              # retrieval recall@k
```

| Set | What it holds | Pass bar |
| --- | --- | --- |
| [`evals/golden.yaml`](evals/golden.yaml) | 49 cases: answerable, trap, ambiguous, off_topic, injection, smalltalk; English and Hebrew | ≥ 85% pass, zero blockers |
| [`evals/retrieval.yaml`](evals/retrieval.yaml) | 26 questions with the passages a good search must return | recall@k ≥ 0.9 |

A blocker is a trap answered with a guess, or a citation no tool returned. CI runs the evals on every change to `app/agent/`, `app/rag/`, the prompts or the corpus, and nightly. `GOOGLE_EVAL_API_KEY` keeps the eval runs off the site's own quota.
