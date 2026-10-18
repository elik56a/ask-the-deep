# 0002. DynamoDB for counters, no Redis

Date: 2026-10-18 · Status: accepted

## Context

The app needs a per-IP rate limit and a daily budget counter. Redis is the usual choice, but a managed Redis bills every hour it exists, even with zero traffic.

## Decision

Counters live in a DynamoDB on-demand table with TTL. No Redis anywhere. The semantic cache is deferred; if it is ever built, it lives in Postgres (pgvector).

## Consequences

- Zero idle cost; pay per read and write only.
- Atomic counters via `UpdateItem ... ADD`; expiry via TTL.
- DynamoDB TTL deletion is lazy (up to ~48 h), so reads must also check `expires_at`.
