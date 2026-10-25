import httpx
from pydantic import SecretStr

from app.agent.github import github_client
from tests.fakes import REPOS, fake_github

MANY = [{**REPOS[0], "name": f"repo-{i}"} for i in range(12)]


async def test_reads_recent_repos() -> None:
    repos = await fake_github().recent_repos(5)
    assert repos is not None
    assert [r.name for r in repos] == ["portfolio-chat"]


async def test_reuses_the_cached_result() -> None:
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json=REPOS)

    github = fake_github(handler)
    await github.recent_repos(5)
    await github.recent_repos(5)
    assert len(calls) == 1
    assert calls[0].url.path == "/users/elik56a/repos"


async def test_returns_none_when_github_fails() -> None:
    assert await fake_github(lambda _: httpx.Response(500)).recent_repos(5) is None


async def test_returns_none_on_timeout() -> None:
    def timeout(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("slow", request=request)

    assert await fake_github(timeout).recent_repos(5) is None


async def test_returns_none_on_unexpected_json() -> None:
    bad = fake_github(lambda _: httpx.Response(200, json={"message": "nope"}))
    assert await bad.recent_repos(5) is None


async def test_reads_the_most_once_and_slices_each_count() -> None:
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json=MANY)

    github = fake_github(handler)
    ten = await github.recent_repos(10)
    three = await github.recent_repos(3)
    assert ten is not None and len(ten) == 10
    assert three is not None and [r.name for r in three] == [
        "repo-0",
        "repo-1",
        "repo-2",
    ]
    assert len(calls) == 1
    assert calls[0].url.params["per_page"] == "30"


async def test_sends_a_token_only_when_set() -> None:
    async with github_client(3.0) as anonymous:
        assert "Authorization" not in anonymous.headers
    async with github_client(3.0, SecretStr("t0ken")) as signed:
        assert signed.headers["Authorization"] == "Bearer t0ken"
