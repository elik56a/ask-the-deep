# 0014. Secrets per environment from SSM, provider limits set by hand

Date: 2026-10-21 · Status: accepted

## Context

P2.10 asks for a Lambda concurrency cap, a spend limit at the model provider, and a separate key per environment. Terraform already created one SSM path per workspace (`/portfolio-chat/<env>/…`), but nothing loaded those values into the API. The LLM key was stored as `LLM_API_KEY`, a name that neither Pydantic AI nor the embedder reads.

## Decision

- **Secrets:** each SSM parameter is named after the environment variable the API reads (`GOOGLE_API_KEY`, `DATABASE_URL`, …). At cold start, `app/ssm.py` loads every parameter under `SSM_PREFIX` into the environment, before settings are read. Parameters still set to Terraform's `CHANGE_ME` are skipped, so an unset optional key (Langfuse) stays off. Locally there is no prefix, and `api/.env` is used.
- **A key per environment:** staging and prod each get their own Google API key, set by hand in their own SSM path. Using a separate Google Cloud project per environment also gives each one its own quota, so staging tests can't use up prod's free-tier quota.
- **Provider spend limit:** set by hand in the Google Cloud console for each project. While a project has no billing account, the Gemini free tier is a hard $0 limit. Once billing is on, a $5 budget with alerts goes on that project, and the app's own caps (ADR 0008) still apply.
- **Concurrency:** `lambda_concurrency` stays at `-1` (no reservation) by default. AWS keeps 10 unreserved, so an account at the default quota of 10 can't reserve any, and its account-wide limit of 10 is already the cap. With a higher quota, set `lambda_concurrency` (for example 5) per workspace.

## Consequences

- Adding a secret means adding its name to `local.secrets` in `infra/main.tf` and setting its value with `aws ssm put-parameter --overwrite`.
- A cold start makes one extra SSM call (tens of milliseconds).
- The provider limit and the keys live outside Terraform, so they are a deploy checklist item (P5.14/P5.15), not something CI can check.
