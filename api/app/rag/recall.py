"""Measures how well search finds the right passages.

Run: `uv run --env-file .env python -m app.rag.recall`. It searches every
question in `evals/retrieval.yaml` against the ingested passages and prints
recall@k per language, the misses, and the similarity scores of right and
wrong passages (the numbers the threshold is calibrated from, P1.11).
"""

import asyncio
import statistics
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from app.config import REPO_ROOT, get_settings
from app.rag.db import create_pool
from app.rag.embeddings import query_embedder
from app.rag.retrieval import HybridRetriever, Retriever

QUESTIONS = REPO_ROOT / "api" / "evals" / "retrieval.yaml"


@dataclass(frozen=True)
class Question:
    """A question and the passages a good search must return."""

    question: str
    language: str
    expected: frozenset[str]


@dataclass
class RecallReport:
    """What one measurement found, split by language."""

    recall: dict[str, list[float]] = field(default_factory=dict)
    misses: list[tuple[str, list[str]]] = field(default_factory=list)
    relevant_scores: list[float] = field(default_factory=list)
    other_scores: list[float] = field(default_factory=list)
    off_topic_best: list[float] = field(default_factory=list)

    def mean_recall(self, language: str | None = None) -> float:
        """Average recall over questions, for one language or all of them."""
        values = [
            v
            for lang, vs in self.recall.items()
            if language in (None, lang)
            for v in vs
        ]
        return statistics.fmean(values) if values else 0.0


def load_questions(path: Path = QUESTIONS) -> list[Question]:
    """Read the hand-written question set."""
    rows = yaml.safe_load(path.read_text(encoding="utf-8"))
    return [
        Question(r["question"], r["language"], frozenset(r["expected"])) for r in rows
    ]


def recall_at_k(expected: frozenset[str], found: list[str]) -> float:
    """The share of the expected passages that search returned."""
    return len(expected & set(found)) / len(expected) if expected else 1.0


async def measure(
    retriever: Retriever, questions: list[Question], top_k: int
) -> RecallReport:
    """Search every question and collect recall and score distributions."""
    report = RecallReport()
    for q in questions:
        hits = await retriever.search(q.question, top_k)
        if not q.expected:
            report.off_topic_best.append(max((h.similarity for h in hits), default=0))
            continue
        found = [h.chunk.chunk_id for h in hits]
        report.recall.setdefault(q.language, []).append(recall_at_k(q.expected, found))
        if missing := sorted(q.expected - set(found)):
            report.misses.append((q.question, missing))
        for h in hits:
            relevant = h.chunk.chunk_id in q.expected
            (report.relevant_scores if relevant else report.other_scores).append(
                h.similarity
            )
    return report


def _spread(scores: list[float]) -> str:
    if not scores:
        return "none"
    low, mid, high = min(scores), statistics.median(scores), max(scores)
    return f"min {low:.3f} · median {mid:.3f} · max {high:.3f} (n={len(scores)})"


def _print(report: RecallReport, top_k: int) -> None:
    for lang in sorted(report.recall):
        n = len(report.recall[lang])
        print(f"recall@{top_k} {lang}: {report.mean_recall(lang):.1%} ({n} questions)")
    print(f"recall@{top_k} all: {report.mean_recall():.1%}")
    for question, missing in report.misses:
        print(f"  miss: {question} → {', '.join(missing)}")
    print(f"similarity, right passages:  {_spread(report.relevant_scores)}")
    print(f"similarity, other passages:  {_spread(report.other_scores)}")
    print(f"similarity, best off-topic:  {_spread(report.off_topic_best)}")


async def main() -> None:
    settings = get_settings()
    async with create_pool(settings) as pool:
        retriever = await HybridRetriever.load(pool, query_embedder(settings))
        report = await measure(retriever, load_questions(), settings.retrieval_top_k)
    print(f"{settings.embedding_model} · corpus {retriever.corpus_version}")
    _print(report, settings.retrieval_top_k)


if __name__ == "__main__":
    asyncio.run(main())
