"""Turns text into embeddings: lists of numbers that represent meaning.

Texts with similar meaning get similar numbers, which is what lets search
find a passage even when it uses different words than the question.
"""

from collections.abc import Awaitable, Callable, Sequence

from pydantic_ai.embeddings import Embedder, TestEmbeddingModel

from app.config import Settings

EmbedFn = Callable[[Sequence[str]], list[list[float]]]
QueryEmbedFn = Callable[[str], Awaitable[list[float]]]


def _embedder(settings: Settings) -> Embedder:
    if settings.embedding_model == "test":
        return Embedder(TestEmbeddingModel(dimensions=settings.embedding_dimensions))
    return Embedder(
        settings.embedding_model,
        settings={"dimensions": settings.embedding_dimensions},
    )


def document_embedder(settings: Settings) -> EmbedFn:
    """A function that embeds passages (used by ingestion)."""
    embedder = _embedder(settings)

    def embed(texts: Sequence[str]) -> list[list[float]]:
        return [list(v) for v in embedder.embed_documents_sync(texts).embeddings]

    return embed


def query_embedder(settings: Settings) -> QueryEmbedFn:
    """A function that embeds a question (used by search)."""
    embedder = _embedder(settings)

    async def embed(query: str) -> list[float]:
        return list((await embedder.embed_query(query)).embeddings[0])

    return embed
