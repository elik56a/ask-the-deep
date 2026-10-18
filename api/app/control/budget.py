"""Spend caps: the site stops answering before it costs more than allowed.

Three caps, each a counter in DynamoDB (in micro-dollars, so sums stay exact):
the month (the hard limit), the day (so one bad day can't burn the month),
and each visitor per day. Before a question, all three must be under their
cap; after it, its real cost is added to all three.
"""

import asyncio
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Protocol

from botocore.exceptions import BotoCoreError, ClientError

from app.config import Settings
from app.control.counters import counters_table, increment, read

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import Table

_DAY = 24 * 3600


def micro_usd(usd: float) -> int:
    """Dollars as whole micro-dollars (DynamoDB adds integers exactly)."""
    return round(usd * 1_000_000)


@dataclass(frozen=True)
class _Cap:
    pk: str
    limit: int
    expires_at: int


class Budget(Protocol):
    """Decides whether a question may run, and records what it cost."""

    async def allows(self, visitor: str) -> bool: ...

    async def record(self, visitor: str, cost_usd: float) -> None: ...


class DynamoBudget:
    """Monthly, daily and per-visitor spend counters in DynamoDB."""

    def __init__(
        self, table: "Table", settings: Settings, clock: Callable[[], float] = time.time
    ) -> None:
        self._table = table
        self._settings = settings
        self._clock = clock

    def _caps(self, visitor: str) -> list[_Cap]:
        now = self._clock()
        day = datetime.fromtimestamp(now, UTC).strftime("%Y-%m-%d")
        month = day[:7]
        return [
            _Cap(
                f"spend#month#{month}",
                micro_usd(self._settings.monthly_budget_usd),
                int(now) + 40 * _DAY,
            ),
            _Cap(
                f"spend#day#{day}",
                micro_usd(self._settings.daily_budget_usd),
                int(now) + 2 * _DAY,
            ),
            _Cap(
                f"spend#visitor#{visitor}#{day}",
                micro_usd(self._settings.visitor_daily_budget_usd),
                int(now) + 2 * _DAY,
            ),
        ]

    async def allows(self, visitor: str) -> bool:
        # ponytail: check-then-spend, so parallel questions can overshoot a cap
        # by a few cents; a conditional write per question if that ever matters.
        caps = self._caps(visitor)
        try:
            spent = await asyncio.gather(*(read(self._table, c.pk) for c in caps))
        except (BotoCoreError, ClientError):
            return False
        return all(s < c.limit for s, c in zip(spent, caps, strict=True))

    async def record(self, visitor: str, cost_usd: float) -> None:
        amount = micro_usd(cost_usd)
        if amount <= 0:
            return
        caps = self._caps(visitor)
        try:
            await asyncio.gather(
                *(increment(self._table, c.pk, c.expires_at, amount) for c in caps)
            )
        except (BotoCoreError, ClientError):
            return


class NoBudget:
    """Used when no DynamoDB table is configured (tests and offline dev)."""

    async def allows(self, visitor: str) -> bool:
        return True

    async def record(self, visitor: str, cost_usd: float) -> None:
        return None


def budget(settings: Settings) -> Budget:
    """The spend budget for these settings."""
    table = counters_table(settings)
    if table is None:
        return NoBudget()
    return DynamoBudget(table, settings)
