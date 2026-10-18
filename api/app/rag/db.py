"""Postgres access: connections and the `chunks` table that stores passages."""

import psycopg
from pgvector.psycopg import register_vector, register_vector_async
from psycopg_pool import AsyncConnectionPool

from app.config import Settings

Conn = psycopg.Connection[tuple[object, ...]]
AsyncConn = psycopg.AsyncConnection[tuple[object, ...]]
Pool = AsyncConnectionPool[AsyncConn]

CORPUS_VERSION_SQL = (
    "SELECT left(md5(coalesce(string_agg(content_hash, '' ORDER BY chunk_id), '')), 12)"
    " FROM chunks"
)


async def configure_connection(conn: AsyncConn) -> None:
    """Teach each new connection about the `vector` column type."""
    await register_vector_async(conn)


def create_pool(settings: Settings) -> Pool:
    """A small pool of async connections for the server."""
    return AsyncConnectionPool(
        settings.database_url.get_secret_value(),
        min_size=0,
        max_size=2,
        open=False,
        kwargs={"autocommit": True},
        configure=configure_connection,
    )


def connect(settings: Settings) -> Conn:
    """One sync connection, for ingestion and tests."""
    conn = psycopg.connect(settings.database_url.get_secret_value(), autocommit=True)
    conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
    register_vector(conn)
    return conn


def create_schema(conn: Conn, dimensions: int) -> None:
    """Create the `chunks` table if it does not exist: one row per passage."""
    # No vector index: exact search over a few hundred rows is fast and fully accurate.
    conn.execute(
        f"""
        CREATE TABLE IF NOT EXISTS chunks (
            chunk_id     text PRIMARY KEY,
            source       text NOT NULL,
            breadcrumb   text NOT NULL,
            text         text NOT NULL,
            metadata     jsonb NOT NULL,
            content_hash text NOT NULL,
            embedding    vector({int(dimensions)}) NOT NULL,
            updated_at   timestamptz NOT NULL DEFAULT now()
        )
        """
    )
