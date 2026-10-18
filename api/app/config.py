from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
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
    rules_version: str = "v1"
    # Placeholder for the naive P0 retriever; calibrated from evals in P1.11.
    retrieval_threshold: float = 0.3
    retrieval_top_k: int = 6
    max_passage_tokens: int = 400
    max_input_chars: int = 500
    max_output_tokens: int = 500
    rate_limit_per_minute: int = 5
    daily_budget_usd: float = 2.0
    turnstile_secret_key: SecretStr | None = None
    langfuse_public_key: SecretStr | None = None
    langfuse_secret_key: SecretStr | None = None
    langfuse_host: str = "https://cloud.langfuse.com"
    allowed_origins: list[str] = ["http://localhost:5173"]

    @property
    def llm_provider_and_name(self) -> tuple[str, str]:
        provider, _, name = self.llm_model.partition(":")
        return provider, name or provider


@lru_cache
def get_settings() -> Settings:
    return Settings()
