import hashlib
from collections.abc import Sequence

from app.rag.corpus import Chunk
from app.rag.retrieval import Hit, tokenize

DIMENSIONS = 768


def bag_of_words_vector(text: str) -> list[float]:
    """Texts that share words get similar vectors, so similarity is meaningful."""
    vector = [0.0] * DIMENSIONS
    for word in tokenize(text):
        vector[int(hashlib.sha256(word.encode()).hexdigest(), 16) % DIMENSIONS] += 1
    vector[0] += 1e-6
    return vector


class FakeEmbedder:
    def __init__(self) -> None:
        self.calls: list[int] = []

    def __call__(self, texts: Sequence[str]) -> list[list[float]]:
        self.calls.append(len(texts))
        return [bag_of_words_vector(t) for t in texts]


async def fake_query_embedder(query: str) -> list[float]:
    return bag_of_words_vector(query)


class StubRetriever:
    def __init__(self, hits: list[Hit]) -> None:
        self.hits = hits
        self.corpus_version = "stub-version"

    async def search(self, query: str, top_k: int) -> list[Hit]:
        return self.hits[:top_k]


def make_chunk(chunk_id: str, text: str) -> Chunk:
    return Chunk(
        chunk_id=chunk_id, source="doc.md", breadcrumb="Doc › Topic", text=text
    )
