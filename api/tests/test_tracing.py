from pydantic import SecretStr

from app.config import Settings
from app.tracing import langfuse_target


def test_tracing_is_off_without_langfuse_keys() -> None:
    assert langfuse_target(Settings(langfuse_public_key=None)) is None


def test_exports_to_langfuse_with_basic_auth() -> None:
    target = langfuse_target(
        Settings(
            langfuse_public_key=SecretStr("pk"),
            langfuse_secret_key=SecretStr("sk"),
            langfuse_base_url="https://cloud.langfuse.com/",
        )
    )
    assert target is not None
    endpoint, headers = target
    assert endpoint == "https://cloud.langfuse.com/api/public/otel/v1/traces"
    assert headers["Authorization"] == "Basic cGs6c2s="  # base64("pk:sk")
