"""The HTTP server: receives questions and streams events back as SSE."""

import hmac
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.agent.chat_agent import PastMessage
from app.agent.github import GitHubActivity, github_client
from app.config import Settings, get_settings
from app.control.budget import budget
from app.control.rate_limit import client_ip, hash_ip, rate_limiter
from app.pipeline import Services, run_pipeline
from app.rag.db import create_pool
from app.rag.embeddings import query_embedder
from app.rag.retrieval import HybridRetriever

_services: Services | None = None


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """On startup, load the search index and open the GitHub and DynamoDB clients."""
    global _services
    settings = get_settings()
    async with (
        create_pool(settings) as pool,
        github_client(settings.github_timeout_s) as http,
    ):
        _services = Services(
            retriever=await HybridRetriever.load(pool, query_embedder(settings)),
            github=GitHubActivity(
                http, settings.github_username, settings.github_cache_seconds
            ),
            limiter=rate_limiter(settings),
            budget=budget(settings),
        )
        yield
    _services = None


def get_services() -> Services:
    """Everything created at startup (replaced by fakes in tests)."""
    if _services is None:
        raise RuntimeError("Services are not ready; the app lifespan did not run")
    return _services


def verify_origin(
    request: Request, settings: Annotated[Settings, Depends(get_settings)]
) -> None:
    """Refuse requests that skip CloudFront, so its IP header can be trusted."""
    secret = settings.origin_verify_secret
    if secret and not hmac.compare_digest(
        request.headers.get("x-origin-verify", ""), secret.get_secret_value()
    ):
        raise HTTPException(status_code=403)


app = FastAPI(
    title="Portfolio chat API",
    lifespan=lifespan,
    dependencies=[Depends(verify_origin)],
)
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
def health(services: Annotated[Services, Depends(get_services)]) -> dict[str, str]:
    """Liveness check, plus which version of the knowledge base is loaded."""
    return {"status": "ok", "corpus_version": services.retriever.corpus_version}


@app.post("/api/chat")
async def chat(
    request: ChatRequest,
    http: Request,
    services: Annotated[Services, Depends(get_services)],
) -> StreamingResponse:
    """Run the pipeline for one question and stream its events."""
    settings = get_settings()
    ip = client_ip(http.headers, http.client.host if http.client else None)
    visitor = hash_ip(ip, settings.ip_hash_salt.get_secret_value())

    async def sse() -> AsyncIterator[str]:
        async for event in run_pipeline(
            request.question, settings, services, visitor, request.history
        ):
            yield f"data: {event.model_dump_json()}\n\n"

    return StreamingResponse(
        sse(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"}
    )
