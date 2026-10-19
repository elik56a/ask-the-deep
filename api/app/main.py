"""The HTTP server: receives questions and streams events back as SSE."""

import hmac
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.agent.chat_agent import PastMessage
from app.agent.github import GitHubActivity, github_client
from app.config import Settings, get_settings
from app.control.budget import budget
from app.control.rate_limit import client_ip, hash_ip, rate_limiter
from app.control.session import Sessions, Turnstile
from app.pipeline import Services, run_pipeline
from app.rag.db import create_pool
from app.rag.embeddings import query_embedder
from app.rag.retrieval import HybridRetriever
from app.stream import HEADERS, ui_message_stream

_services: Services | None = None
_turnstile: Turnstile | None = None


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """On startup, load the search index and open the GitHub and DynamoDB clients."""
    global _services, _turnstile
    settings = get_settings()
    async with (
        create_pool(settings) as pool,
        github_client(settings.github_timeout_s) as http,
        httpx.AsyncClient(timeout=settings.turnstile_timeout_s) as cloudflare,
    ):
        _turnstile = Turnstile(
            cloudflare, settings.turnstile_secret_key.get_secret_value()
        )
        _services = Services(
            retriever=await HybridRetriever.load(pool, query_embedder(settings)),
            github=GitHubActivity(
                http, settings.github_username, settings.github_cache_seconds
            ),
            limiter=rate_limiter(settings),
            budget=budget(settings),
        )
        yield
    _services = _turnstile = None


def get_services() -> Services:
    """Everything created at startup (replaced by fakes in tests)."""
    if _services is None:
        raise RuntimeError("Services are not ready; the app lifespan did not run")
    return _services


def get_turnstile() -> Turnstile:
    """The Turnstile checker created at startup (replaced in tests)."""
    if _turnstile is None:
        raise RuntimeError("Turnstile is not ready; the app lifespan did not run")
    return _turnstile


def get_sessions(settings: Annotated[Settings, Depends(get_settings)]) -> Sessions:
    """Signs and checks session tokens with the configured secret."""
    return Sessions(
        settings.session_secret.get_secret_value(), settings.session_ttl_seconds
    )


def _visitor(http: Request, settings: Settings) -> tuple[str, str]:
    ip = client_ip(http.headers, http.client.host if http.client else None)
    return ip, hash_ip(ip, settings.ip_hash_salt.get_secret_value())


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
    session: str = ""


class SessionRequest(BaseModel):
    """The body of POST /api/session: a token from the Turnstile widget."""

    turnstile_token: str


class SessionResponse(BaseModel):
    """A session token to send with every question, and how long it lasts."""

    session: str
    expires_in: int


@app.get("/api/health")
def health(services: Annotated[Services, Depends(get_services)]) -> dict[str, str]:
    """Liveness check, plus which version of the knowledge base is loaded."""
    return {"status": "ok", "corpus_version": services.retriever.corpus_version}


@app.post("/api/session")
async def start_session(
    request: SessionRequest,
    http: Request,
    turnstile: Annotated[Turnstile, Depends(get_turnstile)],
    sessions: Annotated[Sessions, Depends(get_sessions)],
) -> SessionResponse:
    """Trade a Turnstile token (proof of a real browser) for a session token."""
    settings = get_settings()
    ip, _ = _visitor(http, settings)
    if not await turnstile.verify(request.turnstile_token, ip):
        raise HTTPException(status_code=403, detail="Human check failed")
    return SessionResponse(
        session=sessions.issue(), expires_in=settings.session_ttl_seconds
    )


@app.post("/api/chat")
async def chat(
    request: ChatRequest,
    http: Request,
    services: Annotated[Services, Depends(get_services)],
    sessions: Annotated[Sessions, Depends(get_sessions)],
) -> StreamingResponse:
    """Run the pipeline for one question and stream it in the AI SDK format."""
    settings = get_settings()
    _, visitor = _visitor(http, settings)
    events = run_pipeline(
        request.question,
        settings,
        services,
        visitor,
        sessions.session_id(request.session),
        request.history,
    )
    return StreamingResponse(
        ui_message_stream(events), media_type="text/event-stream", headers=HEADERS
    )
