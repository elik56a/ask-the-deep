"""Finds the passages that best match a question.

Two searches run together and are combined:
- by meaning: compare the question's embedding with every passage's embedding
- by keywords: BM25 ranks passages by shared words (good for exact names)
The two rankings are merged with Reciprocal Rank Fusion (RRF).
"""

import asyncio
import re
from dataclasses import dataclass
from typing import Protocol, Self

from rank_bm25 import BM25Okapi

from app.rag.corpus import Chunk
from app.rag.db import CORPUS_VERSION_SQL, Pool
from app.rag.embeddings import QueryEmbedFn

_WORD = re.compile(r"\w+")
RRF_K = 60


@dataclass(frozen=True)
class Hit:
    """A search result. `similarity` (0-1, by meaning) feeds the decision gate;
    `rrf` is the combined rank score used for ordering.
    """

    chunk: Chunk
    similarity: float
    rrf: float


class Retriever(Protocol):
    """Anything that can search passages (the real one, or a stub in tests)."""

    corpus_version: str

    async def search(self, query: str, top_k: int) -> list[Hit]: ...


def tokenize(text: str) -> list[str]:
    """Split text into lowercase words for keyword search."""
    # No stemming: Hebrew prefixes (ה, ו, ב, ל) stay attached to words.
    # The vector side covers what keyword matching misses.
    return _WORD.findall(text.lower())


def rrf_scores(rankings: list[list[str]], k: int = RRF_K) -> dict[str, float]:
    """Merge several rankings into one score per passage.

    Each list gives a passage 1 / (k + rank). A passage near the top of both
    lists gets the highest total. k=60 is the standard value from the RRF paper.
    """
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, chunk_id in enumerate(ranking, start=1):
            scores[chunk_id] = scores.get(chunk_id, 0.0) + 1 / (k + rank)
    return scores


class HybridRetriever:
    """Search by meaning (pgvector) and by keywords (BM25), merged with RRF."""

    def __init__(
        self,
        pool: Pool,
        embed_query: QueryEmbedFn,
        chunks: list[Chunk],
        corpus_version: str = "",
    ) -> None:
        self.corpus_version = corpus_version
        self._pool = pool
        self._embed_query = embed_query
        self._chunks = {c.chunk_id: c for c in chunks}
        self._ids = list(self._chunks)
        self._bm25 = (
            BM25Okapi([tokenize(c.embed_text) for c in chunks]) if chunks else None
        )

    @classmethod
    async def load(cls, pool: Pool, embed_query: QueryEmbedFn) -> Self:
        """Read all passages from Postgres and build the in-memory keyword index."""
        async with pool.connection() as conn:
            cursor = await conn.execute(
                "SELECT chunk_id, source, breadcrumb, text, metadata FROM chunks"
            )
            rows = await cursor.fetchall()
            version_row = await (await conn.execute(CORPUS_VERSION_SQL)).fetchone()
        chunks = [
            Chunk(
                chunk_id=str(cid),
                source=str(source),
                breadcrumb=str(breadcrumb),
                text=str(text),
                metadata=dict(metadata) if isinstance(metadata, dict) else {},
            )
            for cid, source, breadcrumb, text, metadata in rows
        ]
        version = str(version_row[0]) if version_row else ""
        return cls(pool, embed_query, chunks, version)

    async def _similarities(self, query: str) -> dict[str, float]:
        vector = await self._embed_query(query)
        # Exact scan of every row: fine for a few thousand passages.
        async with self._pool.connection() as conn:
            cursor = await conn.execute(
                "SELECT chunk_id, 1 - (embedding <=> %s::vector) FROM chunks",
                (vector,),
            )
            rows = await cursor.fetchall()
        return {str(cid): float(str(sim)) for cid, sim in rows}

    def _keyword_ranking(self, query: str) -> list[str]:
        if self._bm25 is None:
            return []
        scores = self._bm25.get_scores(tokenize(query))
        ranked = sorted(zip(self._ids, scores, strict=True), key=lambda p: -p[1])
        return [cid for cid, score in ranked if score > 0]

    async def search(self, query: str, top_k: int) -> list[Hit]:
        if not self._chunks:
            return []
        similarities, keyword_ranking = await asyncio.gather(
            self._similarities(query),
            asyncio.to_thread(self._keyword_ranking, query),
        )
        vector_ranking = sorted(similarities, key=lambda cid: -similarities[cid])
        merged = rrf_scores([vector_ranking, keyword_ranking])
        best = sorted(merged, key=lambda cid: -merged[cid])[:top_k]
        return [
            Hit(self._chunks[cid], similarities.get(cid, 0.0), merged[cid])
            for cid in best
            if cid in self._chunks
        ]
