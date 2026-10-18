import httpx

from app.control.session import SITEVERIFY_URL, Sessions, Turnstile


def _turnstile(handler: httpx.MockTransport) -> Turnstile:
    return Turnstile(httpx.AsyncClient(transport=handler), "secret")


def test_session_token_round_trip() -> None:
    sessions = Sessions("secret", ttl_seconds=60)
    first, second = sessions.issue(), sessions.issue()
    assert sessions.session_id(first) is not None
    assert sessions.session_id(first) != sessions.session_id(second)


def test_rejects_forged_tampered_and_expired_tokens() -> None:
    sessions = Sessions("secret", ttl_seconds=60)
    token = sessions.issue()
    assert sessions.session_id("") is None
    assert sessions.session_id(token[:-2] + "xx") is None
    assert Sessions("other-secret", 60).session_id(token) is None
    assert Sessions("secret", ttl_seconds=-1).session_id(token) is None


async def test_turnstile_asks_cloudflare_with_the_secret_token_and_ip() -> None:
    sent: list[httpx.Request] = []

    def cloudflare(request: httpx.Request) -> httpx.Response:
        sent.append(request)
        return httpx.Response(200, json={"success": True})

    assert await _turnstile(httpx.MockTransport(cloudflare)).verify("tok", "1.2.3.4")
    assert str(sent[0].url) == SITEVERIFY_URL
    assert sent[0].content == b"secret=secret&response=tok&remoteip=1.2.3.4"


async def test_turnstile_says_no_when_cloudflare_says_no() -> None:
    no = httpx.MockTransport(lambda _: httpx.Response(200, json={"success": False}))
    assert not await _turnstile(no).verify("tok", "1.2.3.4")


async def test_turnstile_says_no_when_cloudflare_is_unreachable() -> None:
    def down(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("down", request=request)

    assert not await _turnstile(httpx.MockTransport(down)).verify("tok", "1.2.3.4")
    broken = httpx.MockTransport(lambda _: httpx.Response(500))
    assert not await _turnstile(broken).verify("tok", "1.2.3.4")
