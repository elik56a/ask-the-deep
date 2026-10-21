from mypy_boto3_dynamodb.service_resource import Table
from structlog.testing import capture_logs

from app.config import Settings
from app.control.budget import DynamoBudget, NoBudget, budget, micro_usd

CAPS = Settings(
    monthly_budget_usd=1.0, daily_budget_usd=0.10, visitor_daily_budget_usd=0.03
)
OCT_19 = 1_792_368_000.0
DAY = 24 * 3600


class Clock:
    def __init__(self) -> None:
        self.now = OCT_19

    def __call__(self) -> float:
        return self.now


def test_micro_dollars_keep_tiny_costs_exact() -> None:
    assert micro_usd(0.000123) == 123
    assert micro_usd(5) == 5_000_000


async def test_visitor_is_stopped_at_their_daily_cap(counters: Table) -> None:
    caps = DynamoBudget(counters, CAPS, Clock())
    await caps.record("a", 0.02)
    assert await caps.allows("a")
    await caps.record("a", 0.02)
    assert not await caps.allows("a")
    assert await caps.allows("b")


async def test_everyone_is_stopped_at_the_daily_cap(counters: Table) -> None:
    caps = DynamoBudget(counters, CAPS, Clock())
    for visitor in "abcd":
        await caps.record(visitor, 0.025)
    assert not await caps.allows("new-visitor")


async def test_a_new_day_resets_the_daily_caps(counters: Table) -> None:
    clock = Clock()
    caps = DynamoBudget(counters, CAPS, clock)
    await caps.record("a", 0.05)
    clock.now += DAY
    assert await caps.allows("a")


async def test_the_monthly_cap_holds_across_days(counters: Table) -> None:
    clock = Clock()
    caps = DynamoBudget(counters, CAPS, clock)
    for day in range(12):
        clock.now = OCT_19 + day * DAY
        for visitor in "abc":
            await caps.record(visitor, 0.03)
    assert not await caps.allows("new-visitor")


async def test_free_answers_are_not_recorded(counters: Table) -> None:
    await DynamoBudget(counters, CAPS, Clock()).record("a", 0.0)
    assert counters.scan()["Items"] == []


async def test_refuses_when_dynamodb_fails(counters: Table) -> None:
    caps = DynamoBudget(counters, CAPS, Clock())
    counters.delete()
    counters.wait_until_not_exists()
    assert not await caps.allows("a")
    counters.meta.client.create_table(
        TableName=counters.name,
        KeySchema=[{"AttributeName": "pk", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "pk", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )


def test_no_table_means_no_budget() -> None:
    assert isinstance(budget(Settings(dynamodb_table=None)), NoBudget)


async def test_warns_once_when_the_day_crosses_80_percent(counters: Table) -> None:
    caps = DynamoBudget(counters, CAPS, Clock())
    with capture_logs() as logs:
        await caps.record("a", 0.03)
        await caps.record("b", 0.03)
        await caps.record("c", 0.025)
        await caps.record("d", 0.005)
    assert [(log["event"], log["cap"]) for log in logs] == [
        ("budget_80_percent", "day")
    ]
