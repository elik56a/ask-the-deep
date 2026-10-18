"""Human check: Cloudflare Turnstile once, then a signed session for the visit.

Turnstile tokens work only once, so the browser trades one for our own signed
session token (POST /api/session), valid for SESSION_TTL_SECONDS. Every
question carries it. Nothing about the session is stored on the server: the
signature alone proves the server issued it.
"""

from uuid import uuid4

import httpx
from itsdangerous import BadSignature, URLSafeTimedSerializer
from pydantic import BaseModel, ValidationError

SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


class _Verdict(BaseModel):
    success: bool


class Turnstile:
    """Asks Cloudflare whether a Turnstile token came from a real browser."""

    def __init__(self, http: httpx.AsyncClient, secret: str) -> None:
        self._http = http
        self._secret = secret

    async def verify(self, token: str, ip: str) -> bool:
        """True only if Cloudflare confirms the token; any failure means no."""
        try:
            response = await self._http.post(
                SITEVERIFY_URL,
                data={"secret": self._secret, "response": token, "remoteip": ip},
            )
            response.raise_for_status()
            return _Verdict.model_validate(response.json()).success
        except (httpx.HTTPError, ValidationError, ValueError):
            return False


class Sessions:
    """Issues and checks signed session tokens that expire on their own."""

    def __init__(self, secret: str, ttl_seconds: int) -> None:
        self._signer = URLSafeTimedSerializer(secret, salt="session")
        self._ttl = ttl_seconds

    def issue(self) -> str:
        """A new session token carrying a random session id."""
        return self._signer.dumps(uuid4().hex)

    def session_id(self, token: str) -> str | None:
        """The session id if the token is genuine and not expired, else None."""
        try:
            return str(self._signer.loads(token, max_age=self._ttl))
        except BadSignature:
            return None
