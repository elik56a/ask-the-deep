import os
from collections.abc import AsyncIterator, Iterator
from pathlib import Path
from uuid import uuid4

import pytest

os.environ["KNOWLEDGE_DIR"] = str(Path(__file__).parent / "fixtures" / "knowledge")
os.environ["LLM_MODEL"] = "test"
os.environ["EMBEDDING_MODEL"] = "test"
# DynamoDB Local only: dummy credentials so tests can never reach real AWS.
os.environ["AWS_ACCESS_KEY_ID"] = "local"
os.environ["AWS_SECRET_ACCESS_KEY"] = "local"
os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
from mypy_boto3_dynamodb.service_resource import Table
from psycopg_pool import AsyncConnectionPool

from app.config import Settings
from app.control.counters import counters_table, create_table
from app.rag.db import AsyncConn, Conn, Pool, configure_connection, connect

SETTINGS = Settings()
DYNAMODB_LOCAL = "http://localhost:8001"


@pytest.fixture
def schema() -> Iterator[str]:
    """A throwaway Postgres schema, so tests never touch the dev data."""
    name = f"test_{uuid4().hex[:8]}"
    with connect(SETTINGS) as admin:
        admin.execute(f"CREATE SCHEMA {name}")
        yield name
        admin.execute(f"DROP SCHEMA {name} CASCADE")


@pytest.fixture
def conn(schema: str) -> Iterator[Conn]:
    with connect(SETTINGS) as connection:
        connection.execute(f"SET search_path TO {schema}, public")
        yield connection


@pytest.fixture
async def pool(schema: str) -> AsyncIterator[Pool]:
    async with AsyncConnectionPool[AsyncConn](
        SETTINGS.database_url.get_secret_value(),
        min_size=0,
        max_size=2,
        kwargs={"autocommit": True, "options": f"-c search_path={schema},public"},
        configure=configure_connection,
    ) as connection_pool:
        yield connection_pool


@pytest.fixture
def counters() -> Iterator[Table]:
    """A throwaway counters table in DynamoDB Local."""
    settings = Settings(
        dynamodb_table=f"test-{uuid4().hex[:8]}", dynamodb_endpoint=DYNAMODB_LOCAL
    )
    create_table(settings)
    table = counters_table(settings)
    assert table is not None
    yield table
    table.delete()
