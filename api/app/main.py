from collections.abc import AsyncIterator
from functools import lru_cache

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import get_settings
from app.pipeline import run_pipeline
from app.rag.corpus import Chunk, load_corpus

app = FastAPI(title="Portfolio chat API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().allowed_origins,
    allow_methods=["POST"],
    allow_headers=["content-type"],
)


class ChatRequest(BaseModel):
    question: str


@lru_cache
def get_corpus() -> list[Chunk]:
    return load_corpus(get_settings().knowledge_dir)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    async def sse() -> AsyncIterator[str]:
        async for event in run_pipeline(request.question, get_settings(), get_corpus()):
            yield f"data: {event.model_dump_json()}\n\n"

    return StreamingResponse(
        sse(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"}
    )
