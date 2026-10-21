from mypy_boto3_dynamodb.service_resource import Table

from app.control.stats import DynamoStats, NoStats, summarize

OCT_19 = 1_792_368_000.0


def test_summary_shows_averages_and_rates_not_totals() -> None:
    summary = summarize(
        "2026-10",
        {"questions": 4, "no_info": 1, "cost_micro_usd": 2000, "latency_ms": 12_000},
    )
    assert summary.questions == 4
    assert summary.avg_cost_usd == 0.0005
    assert summary.avg_latency_ms == 3000
    assert summary.no_info_rate == 0.25
    assert "cost_micro_usd" not in summary.model_dump()


def test_an_empty_month_is_all_zeros() -> None:
    zeros = dict.fromkeys(("questions", "no_info", "cost_micro_usd", "latency_ms"), 0)
    summary = summarize("2026-10", zeros)
    assert summary.questions == 0
    assert summary.no_info_rate == 0


async def test_records_and_reads_the_month(counters: Table) -> None:
    store = DynamoStats(counters, lambda: OCT_19)
    await store.record(no_info=False, cost_usd=0.001, latency_ms=4000)
    await store.record(no_info=True, cost_usd=0.0, latency_ms=2000)

    summary = await store.read()
    assert summary is not None
    assert summary.month == "2026-10"
    assert summary.questions == 2
    assert summary.avg_cost_usd == 0.0005
    assert summary.avg_latency_ms == 3000
    assert summary.no_info_rate == 0.5


async def test_no_table_means_no_stats() -> None:
    assert await NoStats().read() is None
