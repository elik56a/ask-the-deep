"""The HTTP server: receives questions and streams events back as SSE."""

import asyncio
import hmac
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.agent.chat_agent import PastMessage
from app.agent.github import GitHubActivity, github_client
from app.config import Settings, get_settings
from app.control.budget import budget
from app.control.rate_limit import client_ip, hash_ip, rate_limiter
from app.control.session import Sessions, Turnstile
from app.control.stats import PublicStats, stats
from app.logs import configure_logging
from app.pipeline import Services, run_pipeline
from app.rag.db import create_pool
from app.rag.embeddings import query_embedder
from app.rag.retrieval import HybridRetriever
from app.ssm import load_ssm_secrets
from app.stream import HEADERS, ui_message_stream
from app.tracing import configure_tracing, flush_traces

_services: Services | None = None
_turnstile: Turnstile | None = None
# Where the Lambda Web Adapter posts non-HTTP events, here the warm-up schedule.
WARM_PATH = "/events"


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """On startup, load secrets and the search index, and open the clients."""
    global _services, _turnstile
    if load_ssm_secrets():
        get_settings.cache_clear()
    settings = get_settings()
    configure_logging(settings.log_json)
    configure_tracing(settings)
    async with (
        create_pool(settings) as pool,
        github_client(settings.github_timeout_s, settings.github_token) as http,
        httpx.AsyncClient(timeout=settings.turnstile_timeout_s) as cloudflare,
    ):
        _turnstile = Turnstile(
            cloudflare, settings.turnstile_secret_key.get_secret_value()
        )
        _services = Services(
            retriever=await HybridRetriever.load(pool, query_embedder(settings)),
            github=GitHubActivity(
                http,
                settings.github_username,
                settings.github_cache_seconds,
                settings.github_max_repos,
            ),
            limiter=rate_limiter(settings),
            budget=budget(settings),
            stats=stats(settings),
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
    if request.url.path == WARM_PATH:
        return
    secret = settings.origin_verify_secret
    if secret and not hmac.compare_digest(
        request.headers.get("x-origin-verify", ""), secret.get_secret_value()
    ):
        raise HTTPException(status_code=403)


app = FastAPI(
    title="Ask the Deep API",
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


@app.post(WARM_PATH, status_code=204)
def warm() -> None:
    """Answers the scheduled ping that keeps one Lambda started between visitors.

    It touches nothing, so Neon can still sleep while nobody asks anything.
    """


@app.get("/api/stats")
async def public_stats(
    services: Annotated[Services, Depends(get_services)], response: Response
) -> PublicStats:
    """This month's anonymous usage: questions, averages and the no-info rate."""
    summary = await services.stats.read()
    if summary is None:
        raise HTTPException(status_code=503, detail="Stats are unavailable")
    response.headers["Cache-Control"] = "public, max-age=60"
    return summary


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
        _flush_after(ui_message_stream(events)),
        media_type="text/event-stream",
        headers=HEADERS,
    )


async def _flush_after(chunks: AsyncIterator[str]) -> AsyncIterator[str]:
    # The browser already has every event; the stream stays open until the
    # trace is sent, so Lambda can't freeze with spans still unsent.
    async for chunk in chunks:
        yield chunk
    await asyncio.to_thread(flush_traces)
