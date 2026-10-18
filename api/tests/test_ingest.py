from pathlib import Path

from app.config import Settings
from app.rag.corpus import Chunk, load_corpus
from app.rag.db import Conn
from app.rag.ingest import corpus_version, ingest
from tests.fakes import FakeEmbedder

SETTINGS = Settings()


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
