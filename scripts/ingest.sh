#!/bin/sh
# Ingests data/knowledge/ into a database; only changed passages are embedded.
# No argument: DATABASE_URL from api/.env (local Postgres by default).
# "staging": STAGING_DATABASE_URL from api/.env (Neon).
# In a git worktree without its own api/.env, the main checkout's api/.env is used.
# Usage: scripts/ingest.sh [staging]
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
env="$root/api/.env"
if [ ! -f "$env" ]; then
  main=$(dirname "$(git -C "$root" rev-parse --path-format=absolute --git-common-dir)")
  env="$main/api/.env"
fi
[ -f "$env" ] || { echo "no api/.env found" >&2; exit 1; }

env_value() {
  python3 -c '
import sys
for line in open(sys.argv[1]):
    key, _, value = line.strip().partition("=")
    if key == sys.argv[2]:
        print(value.strip("\"'"'"'"))
' "$env" "$1"
}

if [ "${1:-}" = staging ]; then
  DATABASE_URL=$(env_value STAGING_DATABASE_URL)
  [ -n "$DATABASE_URL" ] || { echo "no STAGING_DATABASE_URL in $env" >&2; exit 1; }
  export DATABASE_URL
fi

url=${DATABASE_URL:-$(env_value DATABASE_URL)}
host=$(echo "$url" | sed -n 's|.*@\([^/?]*\).*|\1|p')
echo "ingesting $root/data/knowledge into ${host:-the default local database}"

cd "$root/api"
# uv splits --env-file on spaces ("portfolio chat"), so pass a relative path.
rel=$(python3 -c 'import os, sys; print(os.path.relpath(sys.argv[1]))' "$env")
uv run --env-file "$rel" python -m app.rag.ingest
