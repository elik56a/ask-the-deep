import itertools
from pathlib import Path

from app.config import Settings
from app.events import StreamEvent
from app.pipeline import run_pipeline
from app.rag.corpus import load_corpus

SETTINGS = Settings(llm_model="test")
CORPUS = load_corpus(SETTINGS.knowledge_dir)


async def _run(question: str, settings: Settings = SETTINGS) -> list[StreamEvent]:
    return [e async for e in run_pipeline(question, settings, CORPUS)]


def _types(events: list[StreamEvent]) -> list[str]:
    return [e.event.type for e in events]


def _assert_well_formed(events: list[StreamEvent]) -> None:
    assert [e.seq for e in events] == list(range(len(events)))
    assert len({e.request_id for e in events}) == 1
    assert all(a.t_ms <= b.t_ms for a, b in itertools.pairwise(events))
    for e in events:
        assert StreamEvent.model_validate_json(e.model_dump_json()) == e


async def test_answers_from_corpus_and_emits_every_stage() -> None:
    events = await _run("Which technologies does Eliyahu work with daily?")
    _assert_well_formed(events)
    types = _types(events)
    assert types[:6] == [
        "request.started",
        "guardrails.checked",
        "retrieval.started",
        "retrieval.completed",
        "decision.made",
        "generation.started",
    ]
    assert "text.delta" in types
    assert types[-3:] == ["citations.attached", "usage.reported", "request.finished"]
    assert events[-1].event.model_dump()["outcome"] == "answered"


async def test_skips_the_model_when_nothing_relevant_is_found() -> None:
    events = await _run("What is your favorite pizza topping?")
    _assert_well_formed(events)
    assert "generation.started" not in _types(events)
    assert events[-1].event.model_dump()["outcome"] == "no_information"


async def test_answers_no_information_in_the_question_language() -> None:
    events = await _run("מה התוספת האהובה עליך בפיצה?")
    delta = next(e.event.model_dump() for e in events if e.event.type == "text.delta")
    assert "אין לי" in delta["text"]


async def test_blocks_input_over_the_length_cap() -> None:
    events = await _run("x" * (SETTINGS.max_input_chars + 1))
    _assert_well_formed(events)
    assert _types(events) == [
        "request.started",
        "guardrails.checked",
        "error",
        "request.finished",
    ]


def test_corpus_only_includes_public_files(tmp_path: Path) -> None:
    (tmp_path / "public.md").write_text("---\nvisibility: public\n---\n## A\ntext\n")
    (tmp_path / "private.md").write_text(
        "---\nvisibility: private\n---\n## B\nsecret\n"
    )
    (tmp_path / "no_front_matter.md").write_text("## C\nunlabeled\n")
    assert [c.source for c in load_corpus(tmp_path)] == ["public.md"]
