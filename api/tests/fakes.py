import hashlib
import json
from collections.abc import AsyncIterator, Callable, Sequence

import httpx
from pydantic_ai.messages import ModelMessage
from pydantic_ai.models.function import (
    AgentInfo,
    DeltaToolCall,
    DeltaToolCalls,
    FunctionModel,
)

from app.agent.github import GITHUB_API, GitHubActivity
from app.agent.tools import AgentDeps
from app.config import Settings
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

    def passages(self) -> list[Chunk]:
        return [h.chunk for h in self.hits]


def make_chunk(
    chunk_id: str, text: str, metadata: dict[str, object] | None = None
) -> Chunk:
    return Chunk(
        chunk_id=chunk_id,
        source=f"{chunk_id}.md",
        breadcrumb="Doc › Topic",
        text=text,
        metadata=metadata or {},
    )


REPOS = [
    {
        "name": "portfolio-chat",
        "description": "Transparent RAG agent",
        "language": "Python",
        "html_url": "https://github.com/elik56a/portfolio-chat",
        "pushed_at": "2026-10-18T10:00:00Z",
        "stargazers_count": 1,
    }
]


def fake_github(
    handler: Callable[[httpx.Request], httpx.Response] | None = None,
) -> GitHubActivity:
    """A GitHub client that never leaves the machine."""
    transport = httpx.MockTransport(
        handler or (lambda _: httpx.Response(200, json=REPOS))
    )
    http = httpx.AsyncClient(base_url=GITHUB_API, transport=transport)
    return GitHubActivity(http, "elik56a", cache_seconds=600)


def make_deps(retriever: StubRetriever, settings: Settings | None = None) -> AgentDeps:
    return AgentDeps(
        retriever=retriever, github=fake_github(), settings=settings or Settings()
    )


Turn = tuple[str, dict[str, object]]


def scripted(*turns: Turn, record: list[ModelMessage] | None = None) -> FunctionModel:
    """A model that plays one turn per request: a tool call ("search_knowledge",
    {"query": ...}) or a final ("answer", {kind, citations, text}). After the
    last turn it repeats it. Args are streamed in two pieces, like a real model.
    Pass `record` to collect the messages the model was sent.
    """
    queue = list(turns)

    async def stream(
        messages: list[ModelMessage], info: AgentInfo
    ) -> AsyncIterator[DeltaToolCalls]:
        if record is not None:
            record.extend(messages)
        name, args = queue.pop(0) if len(queue) > 1 else queue[0]
        if name == "answer":
            name = info.output_tools[0].name
        payload = json.dumps(args)
        half = len(payload) // 2
        yield {0: DeltaToolCall(name=name, json_args=payload[:half])}
        yield {0: DeltaToolCall(json_args=payload[half:])}

    return FunctionModel(stream_function=stream)
