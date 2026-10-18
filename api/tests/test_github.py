import httpx

from tests.fakes import REPOS, fake_github


async def test_reads_recent_repos() -> None:
    repos = await fake_github().recent_repos()
    assert repos is not None
    assert [r.name for r in repos] == ["portfolio-chat"]


async def test_reuses_the_cached_result() -> None:
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json=REPOS)

    github = fake_github(handler)
    await github.recent_repos()
    await github.recent_repos()
    assert len(calls) == 1
    assert calls[0].url.path == "/users/elik56a/repos"


async def test_returns_none_when_github_fails() -> None:
    assert await fake_github(lambda _: httpx.Response(500)).recent_repos() is None


async def test_returns_none_on_timeout() -> None:
    def timeout(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("slow", request=request)

    assert await fake_github(timeout).recent_repos() is None


async def test_returns_none_on_unexpected_json() -> None:
    bad = fake_github(lambda _: httpx.Response(200, json={"message": "nope"}))
    assert await bad.recent_repos() is None
