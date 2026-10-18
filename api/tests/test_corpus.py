from pathlib import Path

from app.rag.corpus import load_corpus


def _write(path: Path, body: str, visibility: str = "public") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"---\ntitle: Doc\nvisibility: {visibility}\n---\n{body}")


def test_only_public_files_are_loaded(tmp_path: Path) -> None:
    _write(tmp_path / "public.md", "## A\ntext\n")
    _write(tmp_path / "private.md", "## B\nsecret\n", visibility="private")
    (tmp_path / "no_front_matter.md").write_text("## C\nunlabeled\n")
    assert [c.source for c in load_corpus(tmp_path)] == ["public.md"]


def test_chunk_ids_come_from_headings_and_survive_insertions(tmp_path: Path) -> None:
    _write(tmp_path / "x" / "doc.md", "## First topic\none\n## Second\ntwo\n")
    before = [c.chunk_id for c in load_corpus(tmp_path)]
    _write(
        tmp_path / "x" / "doc.md", "## New\nzero\n## First topic\none\n## Second\ntwo\n"
    )
    after = [c.chunk_id for c in load_corpus(tmp_path)]
    assert before == ["x/doc.md#first-topic", "x/doc.md#second"]
    assert set(before) <= set(after)


def test_hebrew_headings_make_valid_ids(tmp_path: Path) -> None:
    _write(tmp_path / "he.md", "## ניסיון בפייטק\nטקסט\n")
    assert load_corpus(tmp_path)[0].chunk_id == "he.md#ניסיון-בפייטק"


def test_duplicate_headings_get_unique_ids(tmp_path: Path) -> None:
    _write(tmp_path / "doc.md", "## Same\na\n## Same\nb\n")
    assert [c.chunk_id for c in load_corpus(tmp_path)] == [
        "doc.md#same",
        "doc.md#same-2",
    ]


def test_long_sections_split_at_paragraphs(tmp_path: Path) -> None:
    paragraph = "word " * 60
    _write(tmp_path / "doc.md", "## Long\n" + "\n\n".join([paragraph] * 4))
    chunks = load_corpus(tmp_path, max_tokens=100)
    assert [c.chunk_id for c in chunks] == [f"doc.md#long-{i}" for i in (1, 2, 3, 4)]
    assert all(c.breadcrumb == "Doc › Long" for c in chunks)


def test_embed_text_starts_with_the_breadcrumb(tmp_path: Path) -> None:
    _write(tmp_path / "doc.md", "## Topic\nbody\n")
    assert load_corpus(tmp_path)[0].embed_text == "Doc › Topic\nbody"
