"""Loads the knowledge files into Postgres (run: `uv run python -m app.rag.ingest`).

Read files -> cut into passages -> embed only passages that changed -> save.
Running it again with no changes makes no embedding calls.
"""

import hashlib
import json
from dataclasses import dataclass

from app.config import Settings, get_settings
from app.rag.corpus import Chunk, load_corpus
from app.rag.db import CORPUS_VERSION_SQL, Conn, connect, create_schema
from app.rag.embeddings import EmbedFn, document_embedder


@dataclass(frozen=True)
class IngestReport:
    """What one ingestion run did."""

    embedded: int
    unchanged: int
    deleted: int


def content_hash(chunk: Chunk, embedding_model: str, dimensions: int) -> str:
    """A fingerprint of a passage; if it is unchanged, the stored embedding is reused.

    The embedding model is part of it, so switching models re-embeds everything.
    """
    key = f"{embedding_model}|{dimensions}|{chunk.embed_text}"
    return hashlib.sha256(key.encode()).hexdigest()


def ingest(
    conn: Conn,
    chunks: list[Chunk],
    embed: EmbedFn,
    settings: Settings,
) -> IngestReport:
    """Sync the `chunks` table with `chunks`: embed new or changed passages,
    keep unchanged ones, delete passages that no longer exist.
    """
    create_schema(conn, settings.embedding_dimensions)
    hashes = {
        c.chunk_id: content_hash(
            c, settings.embedding_model, settings.embedding_dimensions
        )
        for c in chunks
    }
    stored = {
        str(cid): str(h)
        for cid, h in conn.execute("SELECT chunk_id, content_hash FROM chunks")
    }
    changed = [c for c in chunks if stored.get(c.chunk_id) != hashes[c.chunk_id]]
    removed = [cid for cid in stored if cid not in hashes]

    vectors = embed([c.embed_text for c in changed]) if changed else []
    with conn.transaction():
        for chunk, vector in zip(changed, vectors, strict=True):
            conn.execute(
                """
                INSERT INTO chunks
                    (chunk_id, source, breadcrumb, text, metadata, content_hash,
                     embedding)
                VALUES (%s, %s, %s, %s, %s, %s, %s::vector)
                ON CONFLICT (chunk_id) DO UPDATE SET
                    source = EXCLUDED.source,
                    breadcrumb = EXCLUDED.breadcrumb,
                    text = EXCLUDED.text,
                    metadata = EXCLUDED.metadata,
                    content_hash = EXCLUDED.content_hash,
                    embedding = EXCLUDED.embedding,
                    updated_at = now()
                """,
                (
                    chunk.chunk_id,
                    chunk.source,
                    chunk.breadcrumb,
                    chunk.text,
                    json.dumps(chunk.metadata, default=str),
                    hashes[chunk.chunk_id],
                    vector,
                ),
            )
        if removed:
            conn.execute("DELETE FROM chunks WHERE chunk_id = ANY(%s)", (removed,))

    return IngestReport(
        embedded=len(changed),
        unchanged=len(chunks) - len(changed),
        deleted=len(removed),
    )


def corpus_version(conn: Conn) -> str:
    """A 12-character fingerprint of the whole knowledge base."""
    row = conn.execute(CORPUS_VERSION_SQL).fetchone()
    return str(row[0]) if row else ""


def main() -> None:
    settings = get_settings()
    chunks = load_corpus(settings.knowledge_dir, settings.max_passage_tokens)
    with connect(settings) as conn:
        report = ingest(conn, chunks, document_embedder(settings), settings)
        version = corpus_version(conn)
    print(
        f"{len(chunks)} passages: {report.embedded} embedded, "
        f"{report.unchanged} unchanged, {report.deleted} deleted · corpus {version}"
    )


if __name__ == "__main__":
    main()
