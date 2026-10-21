from collections import Counter
from pathlib import Path

import pytest

from app.agent.tools import TOOLS
from app.config import REPO_ROOT
from app.evals.golden import GoldenCase, load_golden
from app.rag.corpus import load_corpus

CASES = load_golden()


def test_the_set_covers_every_type_in_both_languages() -> None:
    assert 30 <= len(CASES) <= 50
    types = Counter(c.type for c in CASES)
    assert set(types) == {
        "answerable",
        "trap",
        "ambiguous",
        "off_topic",
        "injection",
        "smalltalk",
    }
    for kind in ("answerable", "trap", "off_topic", "injection", "smalltalk"):
        assert {c.language for c in CASES if c.type == kind} == {"en", "he"}


def test_expected_tools_are_real_tools() -> None:
    names = {tool.name for tool in TOOLS}
    assert {t for c in CASES for t in c.tools} <= names


def test_expected_passages_exist_in_the_public_corpus() -> None:
    root = REPO_ROOT / "data" / "knowledge"
    if not root.exists():
        pytest.skip("the corpus is local only")
    ids = {chunk.chunk_id for chunk in load_corpus(root)}
    assert {chunk for c in CASES for chunk in c.chunks} <= ids


def test_a_trap_with_expected_passages_is_rejected() -> None:
    with pytest.raises(ValueError, match="nothing in the corpus"):
        GoldenCase.model_validate(
            {
                "id": "x",
                "question": "q",
                "language": "en",
                "type": "trap",
                "kinds": ["no_information"],
                "must_not": ["a guess"],
                "chunks": ["profile.md#who-eliyahu-is"],
            }
        )


def test_duplicate_ids_are_rejected(tmp_path: Path) -> None:
    case = "- {id: a, question: q, language: en, type: smalltalk, kinds: [smalltalk]}\n"
    path = tmp_path / "golden.yaml"
    path.write_text(case * 2, encoding="utf-8")
    with pytest.raises(ValueError, match="unique"):
        load_golden(path)
