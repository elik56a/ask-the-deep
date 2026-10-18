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
    embedder = _embedder(settings)

    def embed(texts: Sequence[str]) -> list[list[float]]:
        return [list(v) for v in embedder.embed_documents_sync(texts).embeddings]

    return embed


def query_embedder(settings: Settings) -> QueryEmbedFn:
    embedder = _embedder(settings)

    async def embed(query: str) -> list[float]:
        return list((await embedder.embed_query(query)).embeddings[0])

    return embed
