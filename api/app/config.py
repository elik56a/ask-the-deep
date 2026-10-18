"""All settings in one place, read from environment variables (or api/.env).

Defaults are free and local: the "test" LLM and embedding models, and the
Docker Postgres from docker-compose.yml.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Typed settings; each field maps to an environment variable of the same name."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    llm_model: str = "test"
    llm_fallback_model: str | None = None
    embedding_model: str = "test"
    embedding_dimensions: int = 768
    database_url: SecretStr = SecretStr(
        "postgresql://portfolio:portfolio@localhost:5432/portfolio"
    )
    dynamodb_table: str | None = None
    knowledge_dir: Path = REPO_ROOT / "data" / "knowledge"
    rules_version: str = "v2"
    # Placeholder for the naive P0 retriever; calibrated from evals in P1.11.
    retrieval_threshold: float = 0.3
    retrieval_top_k: int = 6
    max_passage_tokens: int = 400
    max_input_chars: int = 500
    max_output_tokens: int = 500
    # Caps on the agent loop, so a confused model can't run up cost or latency.
    agent_max_requests: int = 4
    agent_max_tool_calls: int = 4
    github_username: str = "elik56a"
    github_timeout_s: float = 3.0
    # Unauthenticated GitHub allows 60 calls/hour; caching keeps us far below it.
    github_cache_seconds: int = 600
    contact_links: dict[str, str] = {"GitHub": "https://github.com/elik56a"}
    rate_limit_per_minute: int = 5
    daily_budget_usd: float = 2.0
    turnstile_secret_key: SecretStr | None = None
    langfuse_public_key: SecretStr | None = None
    langfuse_secret_key: SecretStr | None = None
    langfuse_host: str = "https://cloud.langfuse.com"
    allowed_origins: list[str] = ["http://localhost:5173"]

    @property
    def llm_provider_and_name(self) -> tuple[str, str]:
        """Split "provider:model" into its parts, e.g. ("google-gla", "gemini-...")."""
        provider, _, name = self.llm_model.partition(":")
        return provider, name or provider


@lru_cache
def get_settings() -> Settings:
    """The settings, read once and cached for the life of the process."""
    return Settings()
