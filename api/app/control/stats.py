"""Public usage stats: how many questions, what they cost and how fast they were.

Per calendar month, four counters in DynamoDB: questions, "no information"
answers, total cost (micro-dollars) and total latency (ms). Nothing about the
visitor is stored. The public view shows averages and rates only, never the
total spend, so the exact budget stays private.
"""

import asyncio
import time
from collections.abc import Callable
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Protocol

from botocore.exceptions import BotoCoreError, ClientError
from pydantic import BaseModel

from app.config import Settings
from app.control.budget import micro_usd
from app.control.counters import counters_table, increment, read

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import Table

_KEEP_SECONDS = 400 * 24 * 3600
_FIELDS = ("questions", "no_info", "cost_micro_usd", "latency_ms")


class PublicStats(BaseModel):
    """The body of GET /api/stats."""

    month: str
    questions: int
    avg_cost_usd: float
    avg_latency_ms: int
    no_info_rate: float


def summarize(month: str, totals: dict[str, int]) -> PublicStats:
    """Turn the month's totals into averages and rates."""
    questions = totals["questions"]
    per = max(questions, 1)
    return PublicStats(
        month=month,
        questions=questions,
        avg_cost_usd=round(totals["cost_micro_usd"] / per / 1_000_000, 6),
        avg_latency_ms=round(totals["latency_ms"] / per),
        no_info_rate=round(totals["no_info"] / per, 3),
    )


class Stats(Protocol):
    """Records each finished question and reads the month's public stats."""

    async def record(
        self, *, no_info: bool, cost_usd: float, latency_ms: int
    ) -> None: ...

    async def read(self) -> PublicStats | None: ...


class DynamoStats:
    """Monthly stats counters in DynamoDB."""

    def __init__(self, table: "Table", clock: Callable[[], float] = time.time) -> None:
        self._table = table
        self._clock = clock

    def _month(self) -> str:
        return datetime.fromtimestamp(self._clock(), UTC).strftime("%Y-%m")

    async def record(self, *, no_info: bool, cost_usd: float, latency_ms: int) -> None:
        month, expires_at = self._month(), int(self._clock()) + _KEEP_SECONDS
        amounts = {
            "questions": 1,
            "no_info": int(no_info),
            "cost_micro_usd": micro_usd(cost_usd),
            "latency_ms": latency_ms,
        }
        try:
            await asyncio.gather(
                *(
                    increment(self._table, f"stats#{month}#{name}", expires_at, amount)
                    for name, amount in amounts.items()
                    if amount > 0
                )
            )
        except (BotoCoreError, ClientError):
            return

    async def read(self) -> PublicStats | None:
        month = self._month()
        try:
            values = await asyncio.gather(
                *(read(self._table, f"stats#{month}#{name}") for name in _FIELDS)
            )
        except (BotoCoreError, ClientError):
            return None
        return summarize(month, dict(zip(_FIELDS, values, strict=True)))


class NoStats:
    """Used when no DynamoDB table is configured (tests and offline dev)."""

    async def record(self, *, no_info: bool, cost_usd: float, latency_ms: int) -> None:
        return None

    async def read(self) -> PublicStats | None:
        return None


def stats(settings: Settings) -> Stats:
    """The stats store for these settings."""
    table = counters_table(settings)
    return NoStats() if table is None else DynamoStats(table)
