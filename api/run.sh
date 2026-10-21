#!/bin/sh
# Lambda start command: the Lambda Web Adapter forwards requests to this port.
exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8080}"
