from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import get_settings
from app.pipeline import run_pipeline
from app.rag.db import create_pool
from app.rag.embeddings import query_embedder
from app.rag.retrieval import HybridRetriever, Retriever

_retriever: Retriever | None = None


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    global _retriever
    settings = get_settings()
    async with create_pool(settings) as pool:
        _retriever = await HybridRetriever.load(pool, query_embedder(settings))
        yield
    _retriever = None


def get_retriever() -> Retriever:
    if _retriever is None:
        raise RuntimeError("Retriever is not loaded; the app lifespan did not run")
    return _retriever


app = FastAPI(title="Portfolio chat API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().allowed_origins,
    allow_methods=["POST"],
    allow_headers=["content-type"],
)


class ChatRequest(BaseModel):
    question: str


@app.get("/api/health")
def health(
    retriever: Annotated[Retriever, Depends(get_retriever)],
) -> dict[str, str]:
    return {"status": "ok", "corpus_version": retriever.corpus_version}


@app.post("/api/chat")
async def chat(
    request: ChatRequest, retriever: Annotated[Retriever, Depends(get_retriever)]
) -> StreamingResponse:
    async def sse() -> AsyncIterator[str]:
        async for event in run_pipeline(request.question, get_settings(), retriever):
            yield f"data: {event.model_dump_json()}\n\n"

    return StreamingResponse(
        sse(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"}
    )
