import os
from collections.abc import AsyncIterator, Iterator
from pathlib import Path
from uuid import uuid4

import pytest

os.environ["KNOWLEDGE_DIR"] = str(Path(__file__).parent / "fixtures" / "knowledge")
os.environ["LLM_MODEL"] = "test"
os.environ["EMBEDDING_MODEL"] = "test"

from psycopg_pool import AsyncConnectionPool

from app.config import Settings
from app.rag.db import AsyncConn, Conn, Pool, configure_connection, connect

SETTINGS = Settings()


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
