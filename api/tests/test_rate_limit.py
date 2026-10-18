from mypy_boto3_dynamodb.service_resource import Table

from app.config import Settings
from app.control.rate_limit import (
    DynamoRateLimiter,
    NoRateLimit,
    client_ip,
    hash_ip,
    rate_limiter,
)


class Clock:
    def __init__(self) -> None:
        self.now = 1_000_020.0

    def __call__(self) -> float:
        return self.now


def test_hash_hides_the_ip_and_depends_on_the_salt() -> None:
    hashed = hash_ip("203.0.113.7", "salt")
    assert hashed == hash_ip("203.0.113.7", "salt")
    assert hashed != hash_ip("203.0.113.7", "other-salt")
    assert "203" not in hashed


def test_reads_the_ip_from_cloudfront_then_the_socket() -> None:
    header = "cloudfront-viewer-address"
    assert client_ip({header: "203.0.113.7:46532"}, "10.0.0.1") == "203.0.113.7"
    assert client_ip({header: "2001:db8::1:46532"}, None) == "2001:db8::1"
    assert client_ip({}, "127.0.0.1") == "127.0.0.1"


async def test_blocks_after_the_limit_within_a_minute(counters: Table) -> None:
    limiter = DynamoRateLimiter(counters, limit=2, clock=Clock())
    assert [await limiter.allow("v") for _ in range(3)] == [True, True, False]


async def test_a_new_minute_starts_a_new_count(counters: Table) -> None:
    clock = Clock()
    limiter = DynamoRateLimiter(counters, limit=1, clock=clock)
    assert await limiter.allow("v")
    assert not await limiter.allow("v")
    clock.now += 60
    assert await limiter.allow("v")


async def test_visitors_are_counted_separately(counters: Table) -> None:
    limiter = DynamoRateLimiter(counters, limit=1, clock=Clock())
    assert await limiter.allow("a")
    assert await limiter.allow("b")


async def test_counters_expire_on_their_own(counters: Table) -> None:
    clock = Clock()
    await DynamoRateLimiter(counters, limit=1, clock=clock).allow("v")
    item = counters.scan()["Items"][0]
    assert int(str(item["expires_at"])) > clock.now


async def test_refuses_when_dynamodb_fails(counters: Table) -> None:
    limiter = DynamoRateLimiter(counters, limit=5)
    counters.delete()
    counters.wait_until_not_exists()
    assert not await limiter.allow("v")
    counters.meta.client.create_table(
        TableName=counters.name,
        KeySchema=[{"AttributeName": "pk", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "pk", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )


def test_no_table_means_no_limit() -> None:
    assert isinstance(rate_limiter(Settings(dynamodb_table=None)), NoRateLimit)
