"""The golden question set (`evals/golden.yaml`): what a correct answer looks like.

Each case says which answer kinds count as correct, which facts the answer
must and must not state, which passages hold the answer, and which tools a
good run uses. The eval runner (P4.2) and the quality gate (P4.5) read it.
"""

from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, model_validator

from app.agent.chat_agent import PastMessage
from app.config import REPO_ROOT

GOLDEN = REPO_ROOT / "api" / "evals" / "golden.yaml"

CaseType = Literal[
    "answerable", "trap", "ambiguous", "off_topic", "injection", "smalltalk"
]
Kind = Literal["answered", "no_information", "smalltalk"]


# Tools whose answers come from live data, not passages, so their cases cite none.
_LIVE_TOOLS = {"github_activity"}


class GoldenCase(BaseModel):
    """One question and the answer it should get."""

    id: str
    question: str
    history: list[PastMessage] = []
    language: Literal["en", "he"]
    type: CaseType
    kinds: list[Kind]
    facts: list[str] = []
    must_not: list[str] = []
    chunks: list[str] = []
    tools: list[str] = []

    @model_validator(mode="after")
    def _consistent(self) -> "GoldenCase":
        if not self.kinds:
            raise ValueError(f"{self.id}: no correct answer kind")
        live = bool(self.tools) and set(self.tools) <= _LIVE_TOOLS
        if self.type in ("answerable", "ambiguous") and not (
            self.facts and (self.chunks or live)
        ):
            raise ValueError(f"{self.id}: an answerable case needs facts and chunks")
        if self.type in ("trap", "off_topic", "injection") and self.chunks:
            raise ValueError(f"{self.id}: nothing in the corpus answers a {self.type}")
        if self.type in ("trap", "off_topic", "injection") and not self.must_not:
            raise ValueError(f"{self.id}: a {self.type} case needs must_not")
        return self


def load_golden(path: Path = GOLDEN) -> list[GoldenCase]:
    """Read and check the golden set; ids must be unique."""
    cases = [
        GoldenCase.model_validate(row)
        for row in yaml.safe_load(path.read_text(encoding="utf-8"))
    ]
    ids = [c.id for c in cases]
    if len(set(ids)) != len(ids):
        raise ValueError("golden case ids must be unique")
    return cases
