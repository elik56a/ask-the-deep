import os
from typing import TYPE_CHECKING, cast

import pytest

from app.ssm import UNSET, load_ssm_secrets

if TYPE_CHECKING:
    from mypy_boto3_ssm import SSMClient

PAGES = [
    {"Parameters": [{"Name": "/pc/staging/GOOGLE_API_KEY", "Value": "key-1"}]},
    {"Parameters": [{"Name": "/pc/staging/LANGFUSE_SECRET_KEY", "Value": UNSET}]},
]


class FakeSSM:
    def __init__(self) -> None:
        self.paths: list[str] = []

    def get_paginator(self, _: str) -> "FakeSSM":
        return self

    def paginate(self, Path: str, WithDecryption: bool) -> list[dict[str, object]]:
        assert WithDecryption
        self.paths.append(Path)
        return cast(list[dict[str, object]], PAGES)


@pytest.fixture(autouse=True)
def clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("SSM_PREFIX", "GOOGLE_API_KEY", "LANGFUSE_SECRET_KEY"):
        monkeypatch.delenv(name, raising=False)


def test_loads_set_parameters_by_their_last_name_part() -> None:
    fake = FakeSSM()
    loaded = load_ssm_secrets("/pc/staging", cast("SSMClient", fake))
    assert fake.paths == ["/pc/staging"]
    assert loaded == ["GOOGLE_API_KEY"]
    assert os.environ["GOOGLE_API_KEY"] == "key-1"
    assert "LANGFUSE_SECRET_KEY" not in os.environ


def test_does_nothing_without_a_prefix() -> None:
    fake = FakeSSM()
    assert load_ssm_secrets(client=cast("SSMClient", fake)) == []
    assert fake.paths == []
