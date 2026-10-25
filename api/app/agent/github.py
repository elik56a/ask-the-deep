"""Reads Eliyahu's recent public repositories from the GitHub REST API.

This is the agent's only live outside call. It is cached in memory and never
raises: if GitHub is slow or down, the agent is told "unavailable" and goes on.
"""

import time

import httpx
import structlog
from pydantic import BaseModel, SecretStr, TypeAdapter, ValidationError

GITHUB_API = "https://api.github.com"
_log = structlog.get_logger("github")


class Repo(BaseModel):
    """The few fields of a GitHub repository the agent needs."""

    name: str
    description: str | None
    language: str | None
    html_url: str
    pushed_at: str


_REPOS = TypeAdapter(list[Repo])


class GitHubActivity:
    """Fetches up to `max_repos` recent repos for one user once, reusing them
    for `cache_seconds`, so asking for a different number costs no new call."""

    def __init__(
        self,
        http: httpx.AsyncClient,
        username: str,
        cache_seconds: int,
        max_repos: int,
    ):
        self._http = http
        self._username = username
        self._cache_seconds = cache_seconds
        self._max_repos = max_repos
        self._cached: tuple[float, list[Repo]] | None = None

    async def recent_repos(self, count: int) -> list[Repo] | None:
        """The `count` latest pushed repos, or None if GitHub can't be reached."""
        if self._cached and time.monotonic() - self._cached[0] < self._cache_seconds:
            return self._cached[1][:count]
        try:
            response = await self._http.get(
                f"/users/{self._username}/repos",
                params={"sort": "pushed", "per_page": self._max_repos},
            )
            response.raise_for_status()
            repos = _REPOS.validate_python(response.json())
        except httpx.HTTPStatusError as error:
            # 403/429 is GitHub's rate limit, the usual cause without a token.
            _log.warning("github_unavailable", status=error.response.status_code)
            return None
        except (httpx.HTTPError, ValidationError) as error:
            _log.warning("github_unavailable", error=type(error).__name__)
            return None
        self._cached = (time.monotonic(), repos)
        return repos[:count]


def github_client(
    timeout_s: float, token: SecretStr | None = None
) -> httpx.AsyncClient:
    """An HTTP client for the public GitHub API; a token only raises the rate limit."""
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "portfolio-chat"}
    if token:
        headers["Authorization"] = f"Bearer {token.get_secret_value()}"
    return httpx.AsyncClient(base_url=GITHUB_API, timeout=timeout_s, headers=headers)
