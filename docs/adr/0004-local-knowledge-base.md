# 0004. Knowledge base stays out of git; ingestion runs locally

Date: 2026-10-18 · Status: accepted

## Context

The spec keeps the knowledge files in the repo and runs ingestion in CI. The repo is public, so every draft and every edit history of personal content would be public too, whatever its `visibility:` flag says.

## Decision

`data/knowledge/` is git-ignored. Ingestion runs from the author's machine: locally against Docker Postgres, and against Neon with that environment's `DATABASE_URL` when publishing.

## Consequences

- Drafts and their history stay private; only passages marked `visibility: public` reach the database.
- CI cannot ingest, so updating the live knowledge base is a manual command.
- The files need their own backup, since git no longer holds them.
- Tests use the demo corpus in `api/tests/fixtures/knowledge/`, never the real files.
