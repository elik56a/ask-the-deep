"""All settings in one place, read from environment variables (or api/.env).

Defaults are free and local: the "test" LLM and embedding models, and the
Docker Postgres from docker-compose.yml.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Typed settings; each field maps to an environment variable of the same name."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    llm_model: str = "test"
    # Backup models in the order to try them, as JSON: '["anthropic:claude-haiku-5-5"]'.
    # A model that failed is set aside this long (app/agent/router.py).
    llm_fallback_models: list[str] = []
    llm_cooldown_s: float = 60.0
    embedding_model: str = "test"
    embedding_dimensions: int = 768
    database_url: SecretStr = SecretStr(
        "postgresql://portfolio:portfolio@localhost:5432/portfolio"
    )
    dynamodb_table: str | None = None
    dynamodb_endpoint: str | None = None
    knowledge_dir: Path = REPO_ROOT / "data" / "knowledge"
    rules_version: str = "v7"
    # Cosine similarity a passage needs to reach the model; set from measured
    # scores, between off-topic (max 0.53) and right passages (min 0.62). ADR 0012.
    retrieval_threshold: float = 0.57
    retrieval_top_k: int = 6
    max_passage_tokens: int = 400
    max_input_chars: int = 500
    # The browser keeps the whole session's conversation and sends it with each
    # question; this caps it (oldest messages are dropped first) to bound cost.
    max_history_messages: int = 20
    max_history_chars: int = 2000
    # Hebrew needs about 2-3x the tokens of English, and the structured answer
    # (text plus citations) must fit before anything streams. ADR 0013.
    max_output_tokens: int = 1000
    # Deadlines. The whole question must end before Lambda and CloudFront
    # give up (30 s), so the visitor always gets a clear message.
    request_timeout_s: float = 25.0
    llm_timeout_s: float = 15.0
    # How hard the model thinks before writing; each level up adds seconds per call.
    llm_thinking: Literal["minimal", "low", "medium", "high"] = "minimal"
    # With a backup model, a call slower than this moves on to the backup instead.
    llm_fallback_after_s: float = 8.0
    db_timeout_s: float = 5.0
    # Caps on the agent loop, so a confused model can't run up cost or latency.
    agent_max_requests: int = 4
    agent_max_tool_calls: int = 4
    github_username: str = "elik56a"
    github_timeout_s: float = 3.0
    # Unauthenticated GitHub allows 60 calls/hour; caching keeps us far below it.
    github_cache_seconds: int = 600
    contact_links: dict[str, str] = {
        "LinkedIn": "https://www.linkedin.com/in/elikri",
        "GitHub": "https://github.com/elik56a",
    }
    rate_limit_per_minute: int = 5
    # Spend caps, counted at paid list prices (free-tier calls cost $0 for real).
    monthly_budget_usd: float = 5.0
    daily_budget_usd: float = 0.5
    visitor_daily_budget_usd: float = 0.05
    # Cloudflare's public test secret (always passes); production sets the real one.
    turnstile_secret_key: SecretStr = SecretStr("1x0000000000000000000000000000000AA")
    # Signs session tokens. Production reads the real one from SSM.
    session_secret: SecretStr = SecretStr("local-dev-session-secret")
    session_ttl_seconds: int = 3600
    turnstile_timeout_s: float = 5.0
    langfuse_public_key: SecretStr | None = None
    langfuse_secret_key: SecretStr | None = None
    langfuse_base_url: str = "https://cloud.langfuse.com"
    allowed_origins: list[str] = ["http://localhost:5173"]
    # JSON log lines (production) instead of readable ones; also turns off
    # uvicorn's access log, which prints visitor IPs.
    log_json: bool = False
    # Answer evals (P4.2). The judge defaults to the answering model.
    # A key from a separate Google project, so evals never use the site's quota.
    google_eval_api_key: SecretStr | None = None
    eval_judge_model: str | None = None
    # Pause between cases and before retrying one that failed (free-tier 429s).
    eval_pause_s: float = 0.0
    eval_retry_wait_s: float = 30.0
    eval_retries: int = 3
    # Below this share of graded cases passing, the eval run fails (and CI alerts).
    eval_min_pass_rate: float = 0.85
    # Retrieval recall@k below this fails the recall run (ADR 0011 gate).
    retrieval_min_recall: float = 0.9
    # Salt for hashing visitor IPs. Production reads the real one from SSM.
    ip_hash_salt: SecretStr = SecretStr("local-dev-salt")
    # Set in production: requests without CloudFront's secret header are refused.
    origin_verify_secret: SecretStr | None = None

    @property
    def llm_provider_and_name(self) -> tuple[str, str]:
        """Split "provider:model" into its parts, e.g. ("google", "gemini-...")."""
        provider, _, name = self.llm_model.partition(":")
        return provider, name or provider


@lru_cache
def get_settings() -> Settings:
    """The settings, read once and cached for the life of the process."""
    return Settings()
