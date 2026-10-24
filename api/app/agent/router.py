"""Which model answers: the configured chain, a model that just failed set aside.

Pydantic AI's `FallbackModel` already moves on to the next model when one fails
(an HTTP error, a timeout or a dropped connection). The router adds memory
across questions: a model that failed goes to the back of the chain for
`cooldown_s`, so the next visitors don't wait for it to fail again. Once the
cooldown is over it is tried first again, and an answer from it clears it.

The memory lives in the process (a warm Lambda keeps it between requests). A
cold start forgets it and simply tries the main model first.
"""

import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from functools import cache


def model_name(model: str) -> str:
    """The name a response reports for a model: "google:gemini-x" -> "gemini-x"."""
    return model.partition(":")[2] or model


@dataclass
class ModelRouter:
    """Orders the model chain by recent health; see the module docstring."""

    models: tuple[str, ...]
    cooldown_s: float
    clock: Callable[[], float] = time.monotonic
    _failed_at: dict[str, float] = field(default_factory=dict)

    def chain(self) -> list[str]:
        """Healthy models in order, then cooling ones, the longest-cooled first."""
        now = self.clock()
        cooling = {
            m: t for m, t in self._failed_at.items() if now - t < self.cooldown_s
        }
        healthy = [m for m in self.models if m not in cooling]
        return healthy + sorted(cooling, key=cooling.__getitem__)

    def report(self, chain: Sequence[str], answered_by: str | None) -> None:
        """Records one model call: every model tried before `answered_by` failed.

        `answered_by` is the model name the response reports; None means the
        whole chain failed.
        """
        names = [model_name(m) for m in chain]
        answered = names.index(answered_by) if answered_by in names else len(chain)
        now = self.clock()
        for model in chain[:answered]:
            self._failed_at[model] = now
        if answered < len(chain):
            self._failed_at.pop(chain[answered], None)


@cache
def router(models: tuple[str, ...], cooldown_s: float) -> ModelRouter:
    """One router per configured chain, shared by every request in the process."""
    return ModelRouter(models, cooldown_s)
