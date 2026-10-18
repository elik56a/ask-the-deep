"""Reads Eliyahu's recent public repositories from the GitHub REST API.

This is the agent's only live outside call. It is cached in memory and never
raises: if GitHub is slow or down, the agent is told "unavailable" and goes on.
"""

import time

import httpx
from pydantic import BaseModel, TypeAdapter, ValidationError

GITHUB_API = "https://api.github.com"
_REPO_COUNT = 5


class Repo(BaseModel):
    """The few fields of a GitHub repository the agent needs."""

    name: str
    description: str | None
    language: str | None
    html_url: str
    pushed_at: str


_REPOS = TypeAdapter(list[Repo])


class GitHubActivity:
    """Fetches recent repos for one user, reusing the result for `cache_seconds`."""

    def __init__(self, http: httpx.AsyncClient, username: str, cache_seconds: int):
        self._http = http
        self._username = username
        self._cache_seconds = cache_seconds
        self._cached: tuple[float, list[Repo]] | None = None

    async def recent_repos(self) -> list[Repo] | None:
        """The most recently pushed repos, or None when GitHub can't be reached."""
        if self._cached and time.monotonic() - self._cached[0] < self._cache_seconds:
            return self._cached[1]
        try:
            response = await self._http.get(
                f"/users/{self._username}/repos",
                params={"sort": "pushed", "per_page": _REPO_COUNT},
            )
            response.raise_for_status()
            repos = _REPOS.validate_python(response.json())
        except (httpx.HTTPError, ValidationError):
            return None
        self._cached = (time.monotonic(), repos)
        return repos


def github_client(timeout_s: float) -> httpx.AsyncClient:
    """An HTTP client set up for the public GitHub API (no token needed)."""
    return httpx.AsyncClient(
        base_url=GITHUB_API,
        timeout=timeout_s,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "portfolio-chat",
        },
    )
