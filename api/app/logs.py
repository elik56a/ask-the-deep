"""Log setup: one JSON line per log in production, readable lines locally.

Request logs come from the Emitter (one line per event, with request_id and
stage). Conversation text is never logged, and visitor IPs never appear:
uvicorn's access log, which prints them, is off when logs are JSON.
"""

import logging

import structlog


def configure_logging(json_logs: bool) -> None:
    """Set the log format for the whole app; call once at startup."""
    renderer: structlog.typing.Processor = (
        structlog.processors.JSONRenderer()
        if json_logs
        else structlog.dev.ConsoleRenderer()
    )
    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    )
    logging.getLogger("uvicorn.access").disabled = json_logs
