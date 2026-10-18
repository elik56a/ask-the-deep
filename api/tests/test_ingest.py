import hashlib
from collections.abc import Iterator, Sequence
from pathlib import Path
from uuid import uuid4

import pytest

from app.config import Settings
from app.rag.corpus import Chunk, load_corpus
from app.rag.db import Conn, connect
from app.rag.ingest import corpus_version, ingest

SETTINGS = Settings()


class FakeEmbedder:
    def __init__(self) -> None:
        self.calls: list[int] = []

    def __call__(self, texts: Sequence[str]) -> list[list[float]]:
        self.calls.append(len(texts))
        return [self._vector(t) for t in texts]

    @staticmethod
    def _vector(text: str) -> list[float]:
        digest = hashlib.sha256(text.encode()).digest()
        return [
            float(digest[i % len(digest)]) for i in range(SETTINGS.embedding_dimensions)
        ]


@pytest.fixture
def conn() -> Iterator[Conn]:
    schema = f"test_{uuid4().hex[:8]}"
    with connect(SETTINGS) as connection:
        connection.execute(f"CREATE SCHEMA {schema}")
        connection.execute(f"SET search_path TO {schema}, public")
        yield connection
        connection.execute(f"DROP SCHEMA {schema} CASCADE")


def _corpus(root: Path, sections: dict[str, str]) -> list[Chunk]:
    body = "".join(f"## {h}\n{t}\n" for h, t in sections.items())
    (root / "doc.md").write_text(f"---\ntitle: Doc\nvisibility: public\n---\n{body}")
    return load_corpus(root)


def test_first_run_embeds_everything(conn: Conn, tmp_path: Path) -> None:
    embed = FakeEmbedder()
    report = ingest(conn, _corpus(tmp_path, {"A": "a", "B": "b"}), embed, SETTINGS)
    assert (report.embedded, report.unchanged, report.deleted) == (2, 0, 0)
    assert conn.execute("SELECT count(*) FROM chunks").fetchone() == (2,)


def test_rerun_without_changes_makes_no_embedding_calls(
    conn: Conn,
    tmp_path: Path,
) -> None:
    chunks = _corpus(tmp_path, {"A": "a", "B": "b"})
    ingest(conn, chunks, FakeEmbedder(), SETTINGS)
    embed = FakeEmbedder()
    report = ingest(conn, chunks, embed, SETTINGS)
    assert embed.calls == []
    assert (report.embedded, report.unchanged) == (0, 2)


def test_only_changed_passages_are_reembedded_and_removed_ones_deleted(
    conn: Conn,
    tmp_path: Path,
) -> None:
    ingest(
        conn,
        _corpus(tmp_path, {"A": "a", "B": "b", "C": "c"}),
        FakeEmbedder(),
        SETTINGS,
    )
    version_before = corpus_version(conn)
    embed = FakeEmbedder()
    report = ingest(
        conn, _corpus(tmp_path, {"A": "a", "B": "changed"}), embed, SETTINGS
    )
    assert embed.calls == [1]
    assert (report.embedded, report.unchanged, report.deleted) == (1, 1, 1)
    assert corpus_version(conn) != version_before
