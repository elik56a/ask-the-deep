from contextlib import AbstractAsyncContextManager
from pathlib import Path
from typing import Any

from pydantic_ai import Agent
from pydantic_ai.result import StreamedRunResult

from app.config import Settings
from app.rag.corpus import Chunk

_PROMPTS = Path(__file__).parent / "prompts"


def _load_prompt(version: str) -> str:
    return (_PROMPTS / f"answer_{version}.md").read_text(encoding="utf-8")


def _format_passages(chunks: list[Chunk]) -> str:
    body = "\n\n".join(
        f'<passage id="{c.chunk_id}">\n{c.breadcrumb}\n{c.text}\n</passage>'
        for c in chunks
    )
    return f"<passages>\n{body}\n</passages>"


def stream_answer(
    question: str, chunks: list[Chunk], settings: Settings
) -> AbstractAsyncContextManager[StreamedRunResult[None, Any]]:
    agent: Agent[None, str] = Agent(instructions=_load_prompt(settings.rules_version))
    return agent.run_stream(
        f"{_format_passages(chunks)}\n\nQuestion: {question}",
        model=settings.llm_model,
        model_settings={"max_tokens": settings.max_output_tokens},
    )
