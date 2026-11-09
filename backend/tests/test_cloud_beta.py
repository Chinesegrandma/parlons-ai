"""Public beta authorization regression tests (no real Supabase or provider traffic)."""

import uuid

import httpx
import pytest
from fastapi.testclient import TestClient

from app import cloud_auth, main

ALICE = "11111111-1111-4111-8111-111111111111"
BOB = "22222222-2222-4222-8222-222222222222"


@pytest.fixture
def cloud_api(tmp_path, monkeypatch):
    monkeypatch.setenv("PARLONS_CLOUD_SITE", "true")
    monkeypatch.setenv("MOCK_AI", "false")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPPORT_EMAIL", "owner@example.com")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "public-test-key")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-role-test-key")
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "beta.sqlite3"))
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "beta.sqlite3")

    def fake_verified_user(token):
        if token == "alice":
            return ALICE
        if token == "bob":
            return BOB
        raise ValueError("Invalid token")

    monkeypatch.setattr(cloud_auth, "verify_token", fake_verified_user)
    with TestClient(main.app) as client:
        yield client


def auth(who):
    return {"Authorization": f"Bearer {who}"}


def new_session(client, who, session_id=None):
    response = client.post(
        "/api/backend/sessions",
        json={"id": session_id or str(uuid.uuid4()), "topic": "cafe"},
        headers=auth(who),
    )
    return response


def test_public_config_and_auth_is_mandatory(cloud_api):
    response = cloud_api.get("/api/backend/auth/config")
    assert response.status_code == 200
    assert response.json()["enabled"] is True
    assert response.json()["publishable_key"] == "public-test-key"
    assert cloud_api.get("/health/live").status_code == 200
    assert cloud_api.get("/api/backend/health").status_code == 401
    assert cloud_api.post("/api/backend/sessions", json={"topic": "cafe"}).status_code == 401
    assert cloud_api.get("/api/backend/voices", headers=auth("invalid")).status_code == 401


def test_users_cannot_read_or_claim_each_others_sessions(cloud_api):
    alice = new_session(cloud_api, "alice")
    assert alice.status_code == 200
    session_id = alice.json()["id"]
    assert cloud_api.get(f"/api/backend/sessions/{session_id}", headers=auth("alice")).status_code == 200
    assert cloud_api.get(f"/api/backend/sessions/{session_id}", headers=auth("bob")).status_code == 404
    assert (
        cloud_api.get(
            f"/api/backend/sessions/{session_id}/messages", headers=auth("bob")
        ).status_code
        == 404
    )
    assert new_session(cloud_api, "bob", session_id).status_code == 404
    assert cloud_api.post(
        "/api/backend/chat",
        json={"session_id": session_id, "message": "Bonjour"},
        headers=auth("bob"),
    ).status_code == 404
    assert cloud_api.post(
        f"/api/backend/sessions/{session_id}/review",
        json={"language": "zh"},
        headers=auth("bob"),
    ).status_code == 404
    assert cloud_api.post(
        "/api/backend/speech/transcribe",
        data={"session_id": session_id},
        files={"file": ("test.webm", b"test", "audio/webm")},
        headers=auth("bob"),
    ).status_code == 404


def test_legacy_unowned_rows_are_inaccessible_in_public_beta(cloud_api):
    old = str(uuid.uuid4())
    with main.connect() as db:
        db.execute(
            "INSERT INTO sessions(id, topic, created_at) VALUES (?, ?, ?)",
            (old, "cafe", main.now()),
        )
    for who in ("alice", "bob"):
        assert cloud_api.get(f"/sessions/{old}", headers=auth(who)).status_code == 404


def test_user_deletes_only_their_own_data(cloud_api):
    alice = new_session(cloud_api, "alice").json()["id"]
    bob = new_session(cloud_api, "bob").json()["id"]
    with main.connect() as db:
        db.execute(
            "INSERT INTO messages(session_id, role, content, created_at) "
            "VALUES (?, 'user', 'private', ?)",
            (alice, main.now()),
        )
        db.execute(
            "INSERT INTO transcripts(id, session_id, original_text, created_at) "
            "VALUES (?, ?, 'private', ?)",
            (str(uuid.uuid4()), alice, main.now()),
        )
    response = cloud_api.delete("/api/backend/me/data", headers=auth("alice"))
    assert response.status_code == 200
    assert cloud_api.get(f"/sessions/{alice}", headers=auth("alice")).status_code == 404
    assert cloud_api.get(f"/sessions/{bob}", headers=auth("bob")).status_code == 200
    with main.connect() as db:
        assert db.execute("SELECT COUNT(*) FROM transcripts").fetchone()[0] == 0


def test_deleted_supabase_identity_cannot_reuse_old_jwt(cloud_api, monkeypatch):
    user_session = new_session(cloud_api, "alice").json()["id"]
    original_client = httpx.AsyncClient
    called = []

    def handler(request):
        called.append(str(request.url))
        assert request.method == "DELETE"
        assert request.headers["authorization"] == "Bearer fake-service-role-test-key"
        return httpx.Response(204)

    def fake_client(**kwargs):
        return original_client(
            transport=httpx.MockTransport(handler), **kwargs
        )

    monkeypatch.setattr(httpx, "AsyncClient", fake_client)
    response = cloud_api.delete("/api/backend/me/account", headers=auth("alice"))
    assert response.status_code == 200
    assert len(called) == 1
    with main.connect() as db:
        assert db.execute(
            "SELECT COUNT(*) FROM sessions WHERE id=?", (user_session,)
        ).fetchone()[0] == 0
    assert cloud_api.post("/sessions", json={"topic": "cafe"}, headers=auth("alice")).status_code == 401
    assert new_session(cloud_api, "bob").status_code == 200


def test_rate_limits_are_per_user_and_have_global_budget(cloud_api, monkeypatch):
    monkeypatch.setenv("BETA_USER_CALLS_PER_DAY", "1")
    monkeypatch.setenv("BETA_GLOBAL_CALLS_PER_DAY", "2")
    # Unknown sessions fail before calling any paid model.
    for who in ("alice", "bob"):
        first = cloud_api.post(
            "/api/backend/chat",
            json={"session_id": str(uuid.uuid4()), "message": "Bonjour"},
            headers=auth(who),
        )
        assert first.status_code == 404
    second = cloud_api.post(
        "/api/backend/chat",
        json={"session_id": str(uuid.uuid4()), "message": "Bonjour"},
        headers=auth("alice"),
    )
    assert second.status_code == 429
