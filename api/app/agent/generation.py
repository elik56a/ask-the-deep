"""Asks the LLM to write an answer from the retrieved passages only."""

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
    """Start a streaming LLM call that answers from the given passages.

    The passages are wrapped in <passage> tags so the model treats them as
    data, not instructions.
    """
    agent: Agent[None, str] = Agent(instructions=_load_prompt(settings.rules_version))
    return agent.run_stream(
        f"{_format_passages(chunks)}\n\nQuestion: {question}",
        model=settings.llm_model,
        model_settings={"max_tokens": settings.max_output_tokens},
    )
