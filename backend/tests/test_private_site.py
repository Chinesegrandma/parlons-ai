"""Gateway tests use synthetic providers and the suite's blocked sockets."""

import base64
from concurrent.futures import ThreadPoolExecutor

import httpx
import pytest
from fastapi.testclient import TestClient

from app import main, providers, security

PASSWORD = "private-test-password-123"


@pytest.fixture
def private_api(tmp_path, monkeypatch):
    for name, value in {
        "PARLONS_PUBLIC_SITE": "true",
        "SITE_PASSWORD": PASSWORD,
        "SESSION_SECRET": "a" * 48,
        "MAX_CALLS_PER_MINUTE": "12",
        "MAX_CALLS_PER_DAY": "100",
    }.items():
        monkeypatch.setenv(name, value)
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "private.sqlite3")
    main.app.state.provider_transport = httpx.MockTransport(providers.mock_response)
    main.app.state.frontend_transport = httpx.MockTransport(
        lambda req: httpx.Response(200, text=str(req.url), headers={"content-type": "text/html"})
    )
    with TestClient(main.app, base_url="https://testserver", follow_redirects=False) as client:
        yield client
    del main.app.state.provider_transport
    del main.app.state.frontend_transport


def login(client):
    response = client.post("/auth/login", data={"password": PASSWORD})
    assert response.status_code == 303
    for attribute in ["Secure", "HttpOnly", "SameSite=strict"]:
        assert attribute in response.headers["set-cookie"]


@pytest.mark.parametrize("path", ["/", "/_next/static/a.js", "/demo", "/docs"])
def test_web_requires_login(private_api, path):
    response = private_api.get(path)
    assert response.status_code == 303
    assert response.headers["location"] == "/auth/login"
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("path", ["/health", "/sessions", "/api/backend/health"])
def test_api_requires_login(private_api, path):
    assert private_api.get(path).status_code == 401


def test_login_gateway_logout(private_api):
    assert private_api.get("/health/live").json() == {"status": "ok"}
    assert private_api.get("/auth/login").status_code == 200
    assert private_api.post("/auth/login", data={"password": "wrong"}).status_code == 401
    login(private_api)
    assert private_api.get("/api/backend/health").json()["private_site"] is True
    response = private_api.get("/assets/example.js?v=12")
    assert response.text == "http://127.0.0.1:3000/assets/example.js?v=12"
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]
    assert private_api.post("/auth/logout").status_code == 303
    assert private_api.get("/health").status_code == 401


def test_login_limit(private_api):
    for _ in range(10):
        assert private_api.post("/auth/login", data={"password": "wrong"}).status_code == 401
    response = private_api.post("/auth/login", data={"password": PASSWORD})
    assert response.status_code == 429
    assert int(response.headers["retry-after"]) > 0


@pytest.mark.parametrize(
    "headers", [{"origin": "https://evil.example"}, {"sec-fetch-site": "cross-site"}]
)
def test_csrf(private_api, headers):
    login(private_api)
    assert private_api.post("/sessions", json={"topic": "cafe"}, headers=headers).status_code == 403
    response = private_api.post(
        "/sessions", json={"topic": "cafe"}, headers={"origin": "https://testserver"}
    )
    assert response.status_code == 200


def test_provider_limit_persistence(private_api, monkeypatch):
    login(private_api)
    monkeypatch.setenv("MAX_CALLS_PER_DAY", "1")
    response = private_api.post("/api/backend/speech/synthesize", json={"text": "Bonjour"})
    assert response.status_code == 200
    main.init_db()
    response = private_api.post("/speech/synthesize", json={"text": "Bonjour"})
    assert response.status_code == 429
    assert int(response.headers["retry-after"]) > 0
    assert private_api.post("/sessions", json={"topic": "cafe"}).status_code == 200


def test_atomic_shared_limit(private_api):
    def reserve(_):
        return security.take_limits(main.connect, [("concurrent", 86400, 3)])

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(reserve, range(12)))
    assert results.count(None) == 3


def test_body_limits(private_api):
    login(private_api)
    response = private_api.post(
        "/speech/transcribe", content=b"x", headers={"content-length": str(security.MAX_BODY + 1)}
    )
    assert response.status_code == 413
    response = private_api.post("/chat", content=b"x", headers={"content-length": "invalid"})
    assert response.status_code == 400
    response = private_api.post("/chat", content=iter([b"a" * security.MAX_BODY, b"b"]))
    assert response.status_code == 413


def test_cookie_validation(private_api, monkeypatch):
    token = security.make_session()
    assert security.valid_session(token)
    assert not security.valid_session(token + "a")
    monkeypatch.setenv("SITE_PASSWORD", "another-private-password-123")
    assert not security.valid_session(token)
    token = security.make_session()
    now = security.time.time()
    monkeypatch.setattr(security.time, "time", lambda: now + 43201)
    assert not security.valid_session(token)


@pytest.mark.parametrize("payload", ["[]", "null", "false", '"hello"', "invalid"])
def test_malformed_sessions(private_api, payload):
    encoded = base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")
    assert not security.valid_session(encoded + "." + security.signature(encoded))


def test_fail_closed(private_api, monkeypatch):
    monkeypatch.delenv("SITE_PASSWORD")
    with pytest.raises(RuntimeError, match="SITE_PASSWORD"):
        security.settings()
    monkeypatch.setenv("SITE_PASSWORD", PASSWORD)
    monkeypatch.setenv("SESSION_SECRET", "short")
    with pytest.raises(RuntimeError, match="SESSION_SECRET"):
        security.settings()


def test_unauthenticated_requests_never_reach_provider(private_api):
    calls = []

    def record(request):
        calls.append(request)
        return httpx.Response(500)

    main.app.state.provider_transport = httpx.MockTransport(record)
    for path in [
        "/chat",
        "/speech/transcribe",
        "/speech/synthesize",
        "/api/backend/speech/synthesize",
    ]:
        assert private_api.post(path, json={"text": "Bonjour"}).status_code == 401
    assert calls == []


def test_invalid_public_configuration_prevents_startup(private_api, monkeypatch):
    monkeypatch.setenv("SITE_PASSWORD", "short")
    with pytest.raises(RuntimeError, match="SITE_PASSWORD"):
        with TestClient(main.app):
            pass


def test_reviews_share_the_provider_budget(private_api, monkeypatch):
    login(private_api)
    session = private_api.post("/sessions", json={"topic": "daily"}).json()["id"]
    monkeypatch.setenv("MAX_CALLS_PER_DAY", "1")
    assert (
        private_api.post("/chat", json={"session_id": session, "message": "Bonjour"}).status_code
        == 200
    )
    response = private_api.post(f"/sessions/{session}/review", json={})
    assert response.status_code == 429


def test_login_interface_language(private_api):
    response = private_api.get("/auth/login?lang=en")
    assert "Welcome to your French space." in response.text
    assert 'lang="en"' in response.text
    response = private_api.post("/auth/login", data={"password": "wrong"})
    assert "Incorrect password" in response.text
    assert "Site password" in response.text


@pytest.mark.parametrize(
    "path", ["/translate", "/rewrite", "/api/backend/translate", "/api/backend/rewrite"]
)
def test_learning_actions_share_provider_budget(private_api, monkeypatch, path):
    login(private_api)
    monkeypatch.setenv("MAX_CALLS_PER_DAY", "1")
    assert private_api.post("/speech/synthesize", json={"text": "Bonjour"}).status_code == 200
    payload = {"text": "Bonjour", "language": "en", "style": "polite"}
    response = private_api.post(path, json=payload)
    assert response.status_code == 429
    assert int(response.headers["retry-after"]) > 0
