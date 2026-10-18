"""The HTTP server: receives questions and streams events back as SSE."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.agent.chat_agent import PastMessage
from app.agent.github import GitHubActivity, github_client
from app.config import get_settings
from app.pipeline import run_pipeline
from app.rag.db import create_pool
from app.rag.embeddings import query_embedder
from app.rag.retrieval import HybridRetriever, Retriever

_retriever: Retriever | None = None
_github: GitHubActivity | None = None


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """On startup, load the search index and open the GitHub client."""
    global _retriever, _github
    settings = get_settings()
    async with (
        create_pool(settings) as pool,
        github_client(settings.github_timeout_s) as http,
    ):
        _retriever = await HybridRetriever.load(pool, query_embedder(settings))
        _github = GitHubActivity(
            http, settings.github_username, settings.github_cache_seconds
        )
        yield
    _retriever = _github = None


def get_retriever() -> Retriever:
    """The search engine loaded at startup (replaced by a stub in tests)."""
    if _retriever is None:
        raise RuntimeError("Retriever is not loaded; the app lifespan did not run")
    return _retriever


def get_github() -> GitHubActivity:
    """The GitHub client opened at startup (replaced by a fake in tests)."""
    if _github is None:
        raise RuntimeError("GitHub client is not ready; the app lifespan did not run")
    return _github


app = FastAPI(title="Portfolio chat API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().allowed_origins,
    allow_methods=["POST"],
    allow_headers=["content-type"],
)


class ChatRequest(BaseModel):
    """The body of POST /api/chat. `history` is the conversation so far in this
    session, kept by the browser; the server saves nothing between requests.
    """

    question: str
    history: list[PastMessage] = []


@app.get("/api/health")
def health(
    retriever: Annotated[Retriever, Depends(get_retriever)],
) -> dict[str, str]:
    """Liveness check, plus which version of the knowledge base is loaded."""
    return {"status": "ok", "corpus_version": retriever.corpus_version}


@app.post("/api/chat")
async def chat(
    request: ChatRequest,
    retriever: Annotated[Retriever, Depends(get_retriever)],
    github: Annotated[GitHubActivity, Depends(get_github)],
) -> StreamingResponse:
    """Run the pipeline for one question and stream its events."""

    async def sse() -> AsyncIterator[str]:
        settings = get_settings()
        async for event in run_pipeline(
            request.question, settings, retriever, github, request.history
        ):
            yield f"data: {event.model_dump_json()}\n\n"

    return StreamingResponse(
        sse(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"}
    )
