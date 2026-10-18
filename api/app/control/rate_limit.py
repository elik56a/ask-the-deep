"""At most RATE_LIMIT_PER_MINUTE questions per minute from one visitor.

A visitor is their IP, hashed with a secret salt, so no raw IP is ever stored.
Counts use fixed one-minute windows in DynamoDB. If DynamoDB fails, the
request is refused: protecting the budget matters more than one question.
"""

import hashlib
import hmac
import time
from collections.abc import Callable, Mapping
from typing import TYPE_CHECKING, Protocol

from botocore.exceptions import BotoCoreError, ClientError

from app.config import Settings
from app.control.counters import counters_table, increment

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import Table

_WINDOW_SECONDS = 60


class RateLimiter(Protocol):
    """Decides whether a visitor may ask another question now."""

    async def allow(self, visitor: str) -> bool: ...


def hash_ip(ip: str, salt: str) -> str:
    """A stable id for an IP that can't be turned back into the IP."""
    return hmac.new(salt.encode(), ip.encode(), hashlib.sha256).hexdigest()[:32]


def client_ip(headers: Mapping[str, str], peer: str | None) -> str:
    """The visitor's IP: from CloudFront's header in production, else the socket.

    CloudFront sets `CloudFront-Viewer-Address` ("ip:port") itself, and the API
    only accepts requests that come through CloudFront, so it can't be faked.
    """
    viewer = headers.get("cloudfront-viewer-address")
    if viewer:
        return viewer.rsplit(":", 1)[0]
    return peer or "unknown"


class DynamoRateLimiter:
    """Counts each visitor's questions per minute in DynamoDB."""

    def __init__(
        self, table: "Table", limit: int, clock: Callable[[], float] = time.time
    ) -> None:
        self._table = table
        self._limit = limit
        self._clock = clock

    async def allow(self, visitor: str) -> bool:
        window = int(self._clock() // _WINDOW_SECONDS)
        try:
            hits = await increment(
                self._table,
                f"rate#{visitor}#{window}",
                expires_at=(window + 2) * _WINDOW_SECONDS,
            )
        except (BotoCoreError, ClientError):
            return False
        return hits <= self._limit


class NoRateLimit:
    """Used when no DynamoDB table is configured (tests and offline dev)."""

    async def allow(self, visitor: str) -> bool:
        return True


def rate_limiter(settings: Settings) -> RateLimiter:
    """The rate limiter for these settings."""
    table = counters_table(settings)
    if table is None:
        return NoRateLimit()
    return DynamoRateLimiter(table, settings.rate_limit_per_minute)
