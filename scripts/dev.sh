#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Local DynamoDB for the rate limit; dummy credentials never reach real AWS.
export DYNAMODB_TABLE=portfolio-chat-local-counters DYNAMODB_ENDPOINT=http://localhost:8001
export AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local AWS_DEFAULT_REGION=us-east-1

docker compose up -d --wait
(cd api && uv sync --quiet && uv run python -m app.rag.ingest && uv run python -m app.control.counters)
(cd web && pnpm install --silent)

trap 'kill 0' EXIT
(cd api && uv run uvicorn app.main:app --reload --port 8000) &
(cd web && pnpm dev) &
wait
