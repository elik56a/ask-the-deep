"""Counters in DynamoDB, shared by the rate limit and the spend budget.

Each counter is one item keyed by `pk`. Its `expires_at` timestamp lets
DynamoDB delete it on its own (TTL), so nothing needs cleaning up.
"""

import asyncio
from typing import TYPE_CHECKING

import boto3

from app.config import Settings, get_settings

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import Table


def counters_table(settings: Settings) -> "Table | None":
    """The counters table, or None without DYNAMODB_TABLE (tests, offline dev)."""
    if not settings.dynamodb_table:
        return None
    dynamodb = boto3.resource("dynamodb", endpoint_url=settings.dynamodb_endpoint)
    return dynamodb.Table(settings.dynamodb_table)


async def increment(table: "Table", pk: str, expires_at: int, amount: int = 1) -> int:
    """Add to a counter and return the new value, in one atomic update."""
    response = await asyncio.to_thread(
        table.update_item,
        Key={"pk": pk},
        UpdateExpression="ADD hits :amount SET expires_at = :expires_at",
        ExpressionAttributeValues={":amount": amount, ":expires_at": expires_at},
        ReturnValues="UPDATED_NEW",
    )
    return int(str(response["Attributes"]["hits"]))


async def read(table: "Table", pk: str) -> int:
    """A counter's current value (0 if it doesn't exist yet)."""
    response = await asyncio.to_thread(
        table.get_item, Key={"pk": pk}, ConsistentRead=True
    )
    return int(str(response.get("Item", {}).get("hits", 0)))


def create_table(settings: Settings) -> None:
    """Create the table in DynamoDB Local (Terraform creates it on AWS)."""
    table = counters_table(settings)
    if table is None:
        raise SystemExit("Set DYNAMODB_TABLE first")
    client = table.meta.client
    if settings.dynamodb_table in client.list_tables()["TableNames"]:
        return
    client.create_table(
        TableName=table.name,
        KeySchema=[{"AttributeName": "pk", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "pk", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )


if __name__ == "__main__":
    create_table(get_settings())
