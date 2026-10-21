"""Sends the Emitter's traces to Langfuse over OpenTelemetry (OTLP/HTTP).

Off unless both Langfuse keys are set. Spans are batched and sent at the end
of each request (`flush_traces`), because Lambda may freeze right after the
response and drop anything still waiting in the batch.
"""

import base64

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from app.config import Settings

_FLUSH_TIMEOUT_MS = 2000
_provider: TracerProvider | None = None


def langfuse_target(settings: Settings) -> tuple[str, dict[str, str]] | None:
    """Langfuse's OTel endpoint and auth headers, or None without keys."""
    public, secret = settings.langfuse_public_key, settings.langfuse_secret_key
    if public is None or secret is None:
        return None
    auth = f"{public.get_secret_value()}:{secret.get_secret_value()}"
    endpoint = f"{settings.langfuse_base_url.rstrip('/')}/api/public/otel/v1/traces"
    return endpoint, {
        "Authorization": f"Basic {base64.b64encode(auth.encode()).decode()}",
        "x-langfuse-ingestion-version": "4",
    }


def configure_tracing(settings: Settings) -> bool:
    """Install the global tracer provider if Langfuse is configured."""
    global _provider
    target = langfuse_target(settings)
    if target is None:
        return False
    endpoint, headers = target
    exporter = OTLPSpanExporter(endpoint=endpoint, headers=headers)
    _provider = TracerProvider(
        resource=Resource.create({"service.name": "portfolio-chat"})
    )
    _provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(_provider)
    return True


def flush_traces() -> None:
    """Send every finished span now (blocking; run it off the event loop)."""
    if _provider is not None:
        _provider.force_flush(_FLUSH_TIMEOUT_MS)
