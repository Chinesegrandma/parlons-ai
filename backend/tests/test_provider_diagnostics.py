import httpx
import pytest
from openai import APIConnectionError, APITimeoutError, AuthenticationError

from app import providers


@pytest.mark.parametrize(
    "status,category",
    [
        (401, "authentication"),
        (402, "billing"),
        (403, "permission"),
        (429, "quota_or_rate_limit"),
        (400, "request_rejected"),
        (404, "request_rejected"),
        (500, "upstream"),
    ],
)
def test_status_diagnostics_are_sanitized(status, category, caplog):
    request = httpx.Request("POST", "https://api.elevenlabs.io/?secret=DO_NOT_EXPOSE")
    response = httpx.Response(status, request=request, text="DO_NOT_EXPOSE transcript secret")
    error = httpx.HTTPStatusError("DO_NOT_EXPOSE", request=request, response=response)
    detail = providers.failure_detail("ElevenLabs", "transcribe", error)
    assert category in detail and str(status) in detail
    assert "DO_NOT_EXPOSE" not in detail + caplog.text


@pytest.mark.parametrize(
    "error,category",
    [
        (httpx.ConnectError("DO_NOT_EXPOSE"), "connection"),
        (httpx.ReadTimeout("DO_NOT_EXPOSE"), "timeout"),
        (ValueError("DO_NOT_EXPOSE"), "invalid_response"),
        (RuntimeError("DO_NOT_EXPOSE"), "internal"),
        (APIConnectionError(request=httpx.Request("POST", "https://api.openai.com")), "connection"),
        (APITimeoutError(request=httpx.Request("POST", "https://api.openai.com")), "timeout"),
    ],
)
def test_non_http_diagnostics(error, category, caplog):
    detail = providers.failure_detail("OpenAI", "chat", error)
    assert category in detail
    assert "DO_NOT_EXPOSE" not in detail + caplog.text


def test_openai_authentication_failure_reaches_browser(api, session, monkeypatch):
    async def fail(*_args):
        raise AuthenticationError(
            "DO_NOT_EXPOSE",
            response=httpx.Response(401, request=httpx.Request("POST", "https://api.openai.com")),
            body=None,
        )

    monkeypatch.setattr(providers, "tutor_reply", fail)
    response = api.post("/chat", json={"session_id": session, "message": "Bonjour"})
    assert response.status_code == 502
    assert "authentication HTTP 401" in response.json()["detail"]
    assert "DO_NOT_EXPOSE" not in response.text
