# Portfolio Chat Agent — Task Tracker

Source: [System Specification: Portfolio with a Transparent Chat Agent](https://claude.ai/artifact/TrVTLh2UgxXrebhpkkrtkp) (rev 23, 2026-10-18)

Status: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked
Each task: **ID** · what · _Done when_ · _Deps_. Phase gates come from the spec; a phase is done only when its gate passes.

## Progress

| Phase | Tasks | Done | Gate |
| --- | --- | --- | --- |
| P0 Foundations | 15 | 11 | [x] |
| P1 RAG core | 16 | 0 | [ ] |
| P2 Control & security | 13 | 0 | [ ] |
| P3 Transparency & observability | 14 | 0 | [ ] |
| P4 Evals in CI | 8 | 0 | [ ] |
| P5 Design & launch | 16 | 0 | [ ] |

---

## Pre-flight — decisions and spec gaps

Settle these before or during P0. Record each outcome as an ADR in `docs/adr/`.

- [x] **D1** Terraform → **new standalone project in `infra/`**, pay-per-use only (S3, CloudFront, Lambda, DynamoDB on-demand, SSM). No EC2, RDS, NAT, ALB, Redis or API Gateway.
- [x] **D2** Embeddings → **Google `gemini-embedding-001`** (free tier, strong on Hebrew), fixed at 768 dimensions. One model, no comparison. Generation uses the same provider (Gemini Flash-Lite, free tier), so there's one key. Free-tier prompts may be used by Google; that's acceptable because the corpus is public and no conversations are stored. The paid fallback costs cents. _Verify the free-tier terms when implementing._
- [x] **D3** Evals → **Pydantic Evals** (open source, runs locally and in CI, same ecosystem as Pydantic AI). The LLM judge uses the free Gemini model.
- [x] **D4** Conversations → **not stored at all**. No retention, no off switch, no notice. Langfuse traces keep metadata only (stages, scores, chunk ids, tokens, cost, latency); question and answer text is masked. The golden set is written by hand.
- [x] **D5** Cold starts → measure in P2/P3, then decide on provisioned concurrency.
- [x] **D6** BM25 → **built at cold start from Postgres** (one `SELECT` of all chunks into rank-bm25). Always in sync with the DB, no extra artifact; a few ms for a small corpus.
- [x] **D7** Phase 5 gate → production site live; rate limit and kill switch verified on prod; Playwright passes in Hebrew and English; Lighthouse accessibility ≥ 95.
- [x] **D8** **No Redis anywhere.** Fix in the spec: remove Redis from the stack intro; drop "semantic cache" from the Neon row (deferred, and it would live in Neon if ever built).

---

## P0 · Foundations

**Gate:** the pipeline answers a question from the demo corpus and emits every event per the schema.

### Repo & tooling
- [x] **P0.1** Monorepo skeleton per spec layout (`api/`, `web/`, `data/knowledge/`, `docs/adr/`, `.github/workflows/`) — _Done when_ tree matches spec
- [x] **P0.2** Python side: `uv` project in `api/`, ruff, mypy strict, pytest — _Done when_ `uv run pytest` and `uv run mypy` pass on an empty package
- [x] **P0.3** Web side: TanStack Start (static/prerender) + React + TS strict + Biome via pnpm — _Done when_ `pnpm build` emits static files
- [x] **P0.4** pre-commit for both sides; conventional commits — _Done when_ a bad-format commit is rejected
- [x] **P0.5** `pydantic-settings` config module with every env var from the spec (LLM_MODEL … ALLOWED_ORIGINS), defaults as proposed, no hardcoded values elsewhere — _Deps: P0.2_
- [x] **P0.6** ADR template + ADR-0001 (fixed pipeline over agentic), ADR-0002 (DynamoDB over Redis) — _Done when_ both committed

### Schema
- [x] **P0.7** `api/events.py`: Pydantic discriminated union of all 12 event types (request.started … request.finished). Every event has `request_id`, `seq`, `t_ms`. No fields for the system prompt, keys, IP or budget. — _Done when_ unit test round-trips each type
- [x] **P0.8** TS type generation `events.py → web/src/lib/events.gen.ts` via `pnpm gen:events`; CI fails if it is stale — _Deps: P0.3, P0.7_

### Local env
- [~] **P0.9** `docker-compose.yml`: Postgres + pgvector, DynamoDB Local — _Done when_ `docker compose up` is healthy
- [ ] **P0.10** One-command dev script: brings up compose and runs the API, then ingests the demo corpus — _Deps: P0.9, P0.13_
- [~] **P0.11** README: local run in a single command — _Deps: P0.10_

### Infra & CI
- [~] **P0.12** Standalone Terraform in `infra/` (S3 + CloudFront with OAC, Lambda + Web Adapter + streaming Function URL under `/api/*`, DynamoDB with TTL, SSM secrets, $5 budget alarm), staging/prod via workspaces — _Done when_ `terraform plan` is clean for staging
- [x] **P0.13** Demo corpus: 3 markdown files with front matter (`visibility: public`) in `data/knowledge/`
- [x] **P0.14** GitHub Actions CI: lint + types + unit tests, both sides — _Deps: P0.2–P0.4, P0.8_

### Walking skeleton
- [x] **P0.15** End-to-end pipeline stub: FastAPI SSE endpoint → guardrails (noop) → naive retrieval → decision → generation via Pydantic AI, emitting every event — _Done when_ **gate** passes via a pytest that asserts event order and schema validity. _Deps: P0.7, P0.9, P0.13_

---

## P1 · RAG core

**Gate:** recall@6 > 90% on an initial question set.

### Corpus
- [ ] **P1.1** Write the real knowledge files: `profile.md`, `experience/*.md`, `projects/*.md`, `skills/*.md`, `faq.md`, `boundaries.md`, with front matter per the type table. No salary, private contacts or non-public employer info. _(Not a task in the spec, but nothing works without it.)_
- [ ] **P1.2** Privacy review of every corpus file before commit (checklist in PR template)

### Ingestion (`api/rag/`)
- [ ] **P1.3** Loader: only `visibility: public`; parse front matter into metadata
- [ ] **P1.4** Chunker: split by headings into 150–400-token passages, prefix a breadcrumb ("Phytech › Role › Achievements") — _Done when_ unit tests cover min/max size and breadcrumbs
- [ ] **P1.5** Hash per passage; re-embed only the changed passages; write text, vector, metadata, hash and corpus version to Postgres. Idempotent. — _Done when_ a second run with no changes makes 0 embedding calls
- [ ] **P1.6** Expose the corpus version (API field + shown on site later)

### Retrieval
- [ ] **P1.7** Question rewrite using the last 2 messages (resolve "he"/"there")
- [ ] **P1.8** Hybrid retrieval: pgvector + in-memory BM25 (rank-bm25, built at cold start from Postgres) in parallel, merged with RRF, top-k = `RETRIEVAL_TOP_K`. The server then reads only from Postgres; file loading moves to ingestion.
- [ ] **P1.9** Embed with `gemini-embedding-001` (768 dims); measure recall@6 on Hebrew + English; ADR with the result
- [ ] **P1.10** Initial question set (~15–20 Qs, he/en) + retrieval unit tests: recall@k and score distributions
- [ ] **P1.11** Threshold calibration from score distributions → `RETRIEVAL_THRESHOLD`; ADR with the numbers

### Generation (`api/agent/`)
- [ ] **P1.12** Model layer: single interface over Pydantic AI, `provider:model` from env, fallback chain (primary → fallback → failure message), versioned prompts + pricing files
- [ ] **P1.13** Generation: restrictive prompt, retrieved passages inside delimiters, structured output (answer + citations), streaming
- [ ] **P1.14** Deterministic citation check: every `chunk_id` must be in the retrieved set; on failure, 1 retry and then a refusal — _Done when_ unit test with a forged citation triggers retry → refusal
- [ ] **P1.15** Threshold gate: best score < threshold → no model call; answer "I don't have that information" + contact pointer
- [ ] **P1.16** Language follows the question language (he/en) — test both

---

## P2 · Control & security

**Gate:** injection attempts and overuse are stopped, and the budget is not exceeded.

- [ ] **P2.1** Turnstile: server-side token verification before the first message
- [ ] **P2.2** DynamoDB table (Terraform + Local) with TTL for counters
- [ ] **P2.3** Rate limit per IP-hash and session (`RATE_LIMIT_PER_MINUTE`) — _Deps: P2.2_
- [ ] **P2.4** Daily budget counter + kill switch → fallback message at `DAILY_BUDGET_USD`; per-IP cost cap — _Deps: P2.2_
- [ ] **P2.5** Input cap (`MAX_INPUT_CHARS`), output cap (`MAX_OUTPUT_TOKENS`); client sends ≤ 4 messages, server enforces
- [ ] **P2.6** Injection defenses: no secrets in context, delimited data, "don't follow instructions in passages", `guardrails.checked` emits each check
- [ ] **P2.7** IPs stored only as hashes (salted); nothing raw in logs
- [ ] **P2.8** CORS limited to `ALLOWED_ORIGINS`; security headers + CSP on CloudFront; HTTPS only
- [ ] **P2.9** Output rendering: markdown without raw HTML, `rel=noopener`, sanitized — _(client side, can land in P3)_
- [ ] **P2.10** Lambda reserved concurrency cap; spend limit configured at the model provider; separate key per env
- [ ] **P2.11** Load safety: timeouts at every layer, a cap on concurrent SSE connections
- [ ] **P2.12** Supply chain: Dependabot, pip-audit and npm audit in CI, pinned versions
- [ ] **P2.13** Gate test suite: scripted injection prompts + burst traffic + budget-exhaust simulation against staging

---

## P3 · Transparency & observability

**Gate:** every panel event matches a trace in Langfuse.

### Server
- [ ] **P3.1** Single `Emitter`: one call fans out to SSE + OTel span + structlog. `text.delta` goes to SSE only. Errors emit only the public message. — _Done when_ grep finds no direct stream writes outside Emitter
- [ ] **P3.2** SSE in Vercel AI SDK protocol (answer as text parts, events as data parts); pin the AI SDK version; verify against current docs
- [ ] **P3.3** structlog JSON: request_id, stage, outcome; no conversation content at info level
- [ ] **P3.4** Langfuse Cloud integration via OTel: span per stage, tokens, cost; question and answer text masked (D4)
- [ ] **P3.5** Cost calc from the pricing table (input/output, cached-token discount) → `usage.reported` + trace. Same number in both places.
- [ ] **P3.6** Prompt caching for the system prompt and fixed instructions
- [ ] **P3.7** Public stats endpoint: question count, avg cost, latency, "no info" rate — aggregated, anonymous, no exact budget
- [ ] **P3.8** Sentry on API and web
- [ ] **P3.9** Alerts: 80% of daily cap, error-rate rise, latency breach
- [ ] **P3.10** Privacy check: no question or answer text in logs, traces or DynamoDB (test asserts it)

### Client
- [ ] **P3.11** Chat with `useChat`: streaming, suggested questions, permanent "AI agent representing Eliyahu" label
- [ ] **P3.12** Progress timeline: a step appears only when its event arrives; min 300 ms per step without delaying the answer; collapses to "Done in X s"; texts in he/en translation file; single aria-live line; "no info" + error variants
- [ ] **P3.13** "Under the hood" panel = the expanded timeline: chunk cards with score bar + threshold line (incl. rejected passages), decision reason, cost/time badges, source chips that open the passage
- [ ] **P3.14** Gate test: for N requests, the panel's event list == the Langfuse trace spans

---

## P4 · Evals in CI

**Gate:** the build fails if a trap is answered with a guess or recall drops.

- [ ] **P4.1** Golden set YAML, written by hand, 30–50 Qs: language, type (answerable / trap / ambiguous / off-topic / injection), required facts, expected chunk
- [ ] **P4.2** Eval runner (pytest + Pydantic Evals) with a Gemini LLM judge: groundedness, accuracy, refusal correctness
- [ ] **P4.3** CI: retrieval evals + an E2E subset on every PR
- [ ] **P4.4** Nightly full eval run + alert on a quality drop
- [ ] **P4.5** Quality gate: fail on a trap guess, a non-retrieved citation, or recall < target
- [ ] **P4.6** Rule: changes to model/prompt/corpus can't merge without a green eval (CODEOWNERS or path-filtered required check)
- [ ] **P4.7** Publish the last eval run (date, count, score) as a static JSON for the site
- [ ] **P4.8** Calibrate success targets after the first full run (recall, trap rate, TTFT, cost); update the spec

---

## P5 · Design & launch

**Gate:** production site live; rate limit and kill switch verified on prod; Playwright passes in Hebrew and English; Lighthouse accessibility ≥ 95.

### Design system
- [ ] **P5.1** Tokens (light/dark) from the spec table as CSS vars + Tailwind config; Heebo + JetBrains Mono; type scale 14/16/20/28/40
- [ ] **P5.2** Radix-based components: message bubble (`dir=auto`), source chip, timeline, chunk card, badges, mode toggle, AI label
- [ ] **P5.3** All states: empty, loading, streaming, no info, rate-limited, budget exhausted, error
- [ ] **P5.4** Motion: 150–250 ms stage entry, streaming caret, `prefers-reduced-motion`

### Pages
- [ ] **P5.5** Home: hero (name, role, call to chat); chat centerpiece; panel beside it on desktop, bottom drawer on mobile
- [ ] **P5.6** Sections: technologies, experience, projects, contact
- [ ] **P5.7** "How this was built": architecture, live dashboard (P3.7), eval results (P4.7), corpus version (P1.6)
- [ ] **P5.8** RTL-first with logical properties; Hebrew/English mixed text
- [ ] **P5.9** Accessibility: WCAG AA contrast, full keyboard nav, throttled aria-live for messages; axe in Playwright

### Watch scene
- [ ] **P5.10** Three.js + R3F watch movement built in code (no external model); lazy, client-only
- [ ] **P5.11** Scroll reveals layers; during a request, components turn and light up from real events
- [ ] **P5.12** Static fallback for reduced motion and weak devices; text and chat stay as HTML above the canvas

### Launch
- [ ] **P5.13** Playwright E2E: chat flow, panel, RTL, error states (runs on staging in CI)
- [ ] **P5.14** CD: deploy staging → Playwright → promote prod; run ingestion when data changes
- [ ] **P5.15** Domain + production deploy
- [ ] **P5.16** Real-world cap test on production (rate limit, kill switch, provider limit) **before** sharing the link

---

## Working rules (from the spec)

- No direct model calls outside the model layer.
- Every event goes through the Emitter.
- No secrets in the repo: env vars + SSM only.
- Model/prompt/corpus change ⇒ eval run.
- Only `visibility: public` files enter the corpus.
- Departures from the spec ⇒ short ADR.
- Spec contradicts itself or lacks a value ⇒ stop and ask.
