import re
from dataclasses import dataclass

from app.rag.corpus import Chunk

_WORD = re.compile(r"\w{3,}")


@dataclass(frozen=True)
class Hit:
    chunk: Chunk
    score: float


def _words(text: str) -> set[str]:
    return set(_WORD.findall(text.lower()))


# TODO(P1.8): word-overlap placeholder, replaced by hybrid vector + BM25 search.
def retrieve(corpus: list[Chunk], query: str, top_k: int) -> list[Hit]:
    query_words = _words(query)
    if not query_words:
        return []
    hits = [
        Hit(
            chunk,
            len(query_words & _words(f"{chunk.breadcrumb} {chunk.text}"))
            / len(query_words),
        )
        for chunk in corpus
    ]
    return sorted(hits, key=lambda h: h.score, reverse=True)[:top_k]
