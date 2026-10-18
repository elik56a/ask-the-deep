import psycopg
from pgvector.psycopg import register_vector

from app.config import Settings

Conn = psycopg.Connection[tuple[object, ...]]


def connect(settings: Settings) -> Conn:
    conn = psycopg.connect(settings.database_url.get_secret_value(), autocommit=True)
    conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
    register_vector(conn)
    return conn


def create_schema(conn: Conn, dimensions: int) -> None:
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
