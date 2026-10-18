import pytest

from app.config import Settings
from app.rag.db import Conn, Pool
from app.rag.ingest import corpus_version, ingest
from app.rag.retrieval import HybridRetriever, rrf_scores
from tests.fakes import FakeEmbedder, fake_query_embedder, make_chunk

SETTINGS = Settings()
CORPUS = [
    make_chunk("work", "Eliyahu works at Phytech as a senior full stack engineer"),
    make_chunk("devconverter", "DevConverter is a suite of developer tools"),
    make_chunk("languages", "He speaks Hebrew English and French"),
]


@pytest.fixture
async def retriever(conn: Conn, pool: Pool) -> HybridRetriever:
    ingest(conn, CORPUS, FakeEmbedder(), SETTINGS)
    return await HybridRetriever.load(pool, fake_query_embedder)


def test_rrf_rewards_passages_ranked_high_in_both_lists() -> None:
    scores = rrf_scores([["a", "b", "c"], ["b", "a"]])
    assert max(scores, key=lambda cid: scores[cid]) in {"a", "b"}
    assert scores["c"] < scores["a"]


async def test_finds_the_passage_closest_in_meaning(retriever: HybridRetriever) -> None:
    hits = await retriever.search("Where does Eliyahu work?", top_k=3)
    assert hits[0].chunk.chunk_id == "work"
    assert hits[0].similarity > hits[-1].similarity


async def test_exact_keyword_match_ranks_first(retriever: HybridRetriever) -> None:
    hits = await retriever.search("DevConverter", top_k=3)
    assert hits[0].chunk.chunk_id == "devconverter"


async def test_respects_top_k(retriever: HybridRetriever) -> None:
    assert len(await retriever.search("Eliyahu", top_k=2)) == 2


def test_reports_the_loaded_corpus_version(
    retriever: HybridRetriever, conn: Conn
) -> None:
    assert retriever.corpus_version == corpus_version(conn)
    assert len(retriever.corpus_version) == 12


async def test_empty_database_returns_no_hits(conn: Conn, pool: Pool) -> None:
    ingest(conn, [], FakeEmbedder(), SETTINGS)
    retriever = await HybridRetriever.load(pool, fake_query_embedder)
    assert await retriever.search("anything", top_k=3) == []
