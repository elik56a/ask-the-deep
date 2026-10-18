#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose up -d --wait
(cd api && uv sync --quiet && uv run python -m app.rag.ingest)
(cd web && pnpm install --silent)

trap 'kill 0' EXIT
(cd api && uv run uvicorn app.main:app --reload --port 8000) &
(cd web && pnpm dev) &
wait
