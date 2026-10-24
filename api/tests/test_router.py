"""The router sets a failed model aside for its cooldown, then tries it first again."""

import pytest

from app.agent.chat_agent import _available, _router
from app.agent.router import ModelRouter, model_name
from app.config import Settings

MAIN = "google:gemini-main"
BACKUP = "anthropic:claude-backup"
SPARE = "google:gemini-spare"


class Clock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


def make(clock: Clock) -> ModelRouter:
    return ModelRouter((MAIN, BACKUP, SPARE), cooldown_s=60, clock=clock)


def test_names_match_what_responses_report() -> None:
    assert model_name(MAIN) == "gemini-main"
    assert model_name("test") == "test"


def test_keeps_the_configured_order_while_all_are_healthy() -> None:
    assert make(Clock()).chain() == [MAIN, BACKUP, SPARE]


def test_moves_a_model_that_failed_to_the_back() -> None:
    routing = make(Clock())
    routing.report([MAIN, BACKUP, SPARE], "claude-backup")
    assert routing.chain() == [BACKUP, SPARE, MAIN]


def test_tries_it_first_again_after_the_cooldown() -> None:
    clock = Clock()
    routing = make(clock)
    routing.report([MAIN, BACKUP, SPARE], "claude-backup")
    clock.now = 61
    assert routing.chain() == [MAIN, BACKUP, SPARE]


def test_an_answer_clears_a_cooling_model() -> None:
    clock = Clock()
    routing = make(clock)
    routing.report([MAIN, BACKUP, SPARE], "claude-backup")
    clock.now = 61
    routing.report([MAIN, BACKUP, SPARE], "gemini-main")
    clock.now = 62
    routing.report([MAIN, BACKUP, SPARE], "claude-backup")
    assert routing.chain() == [BACKUP, SPARE, MAIN]


def test_cooling_models_go_last_the_longest_cooled_first() -> None:
    clock = Clock()
    routing = make(clock)
    routing.report([MAIN, BACKUP, SPARE], "claude-backup")
    clock.now = 10
    routing.report([BACKUP, SPARE, MAIN], "gemini-spare")
    assert routing.chain() == [SPARE, MAIN, BACKUP]


def test_when_the_whole_chain_fails_all_cool_down_in_order() -> None:
    routing = make(Clock())
    routing.report([MAIN, BACKUP, SPARE], None)
    assert routing.chain() == [MAIN, BACKUP, SPARE]


def test_a_backup_without_an_api_key_is_left_out(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    backup = "openai:gpt-5-nano"
    settings = Settings(llm_model="test", llm_fallback_models=[backup])
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    _available.cache_clear()
    assert _router(settings).chain() == ["test"]
    monkeypatch.setenv("OPENAI_API_KEY", "")
    _available.cache_clear()
    assert _router(settings).chain() == ["test"]
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    _available.cache_clear()
    assert _router(settings).chain() == ["test", backup]
