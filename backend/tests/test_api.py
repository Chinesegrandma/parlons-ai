import json
import sqlite3
import uuid

import httpx
import pytest
from fastapi.testclient import TestClient

from app import main, providers


def chat(api, session, **fields):
    return api.post("/chat", json={"session_id": session, "message": "Bonjour", **fields})


def transcribe(api, session, content=b"mock bytes; not speech", mime="audio/webm"):
    return api.post(
        "/speech/transcribe",
        data={"session_id": session},
        files={"file": ("mock.webm", content, mime)},
    )


def test_health_mock_mode(api):
    assert api.get("/health").json() == {
        "status": "ok",
        "mode": "mock",
        "speech_ready": True,
        "stt_ready": True,
        "mock_ai": True,
    }


def test_opening_created_once_on_refresh_and_retry(api):
    session_id = str(uuid.uuid4())
    payload = {"id": session_id, "topic": "cafe"}
    first = api.post("/sessions", json=payload).json()
    for _ in range(3):
        assert api.post("/sessions", json=payload).json() == first
        assert api.get(f"/sessions/{session_id}").json() == first
    assert len(first["messages"]) == 1
    assert first["messages"][0]["content"] == main.OPENERS["cafe"]
    assert first["messages"][0]["is_opening"] == 1
    assert api.post("/sessions", json={**payload, "topic": "travel"}).status_code == 409


def test_opening_in_llm_context_and_long_history(api, session, transport):
    requests = []

    def handler(request):
        requests.append(json.loads(request.content))
        return providers.mock_response(request)

    transport(handler)
    for _ in range(8):
        assert chat(api, session).status_code == 200
    for request in requests:
        context = request["messages"]
        assert context[1] == {"role": "assistant", "content": main.OPENERS["cafe"]}
        assert sum(m["content"] == main.OPENERS["cafe"] for m in context) == 1
        assert context[-1] == {"role": "user", "content": "Bonjour"}
    assert len(requests[-1]["messages"]) == 15
    assert len(api.get(f"/sessions/{session}/messages").json()["messages"]) == 17


def test_openai_success(api, session, transport):
    def handler(request):
        data = providers.mock_response(request).json()
        data["choices"][0]["message"]["content"] = json.dumps(
            {"reply": "Bonjour ! Que souhaitez-vous boire ?", "correction": ""}
        )
        return httpx.Response(200, json=data)

    transport(handler)
    result = chat(api, session)
    assert result.status_code == 200
    assert result.json()["reply"] == "Bonjour ! Que souhaitez-vous boire ?"
    assert result.json()["correction"] == ""


@pytest.mark.parametrize(
    "content",
    [
        "not json",
        "{}",
        "[]",
        '{"reply":"","correction":""}',
        '{"reply":"   ","correction":""}',
        '{"reply":123,"correction":""}',
        '{"reply":"Bonjour","correction":null}',
        '{"reply":"Bonjour","correction":{},"extra":true}',
    ],
)
def test_openai_malformed_response_does_not_persist_turn(api, session, transport, content):
    def handler(request):
        data = providers.mock_response(request).json()
        data["choices"][0]["message"]["content"] = content
        return httpx.Response(200, json=data)

    transport(handler)
    assert chat(api, session).status_code == 502
    assert len(api.get(f"/sessions/{session}/messages").json()["messages"]) == 1


def test_openai_timeout_no_retry(api, session, transport):
    calls = []

    def handler(request):
        calls.append(request)
        raise httpx.ReadTimeout("mock timeout", request=request)

    transport(handler)
    assert chat(api, session).status_code == 502
    assert len(calls) == 1
    assert len(api.get(f"/sessions/{session}/messages").json()["messages"]) == 1


def test_unknown_session_and_blank_input(api):
    assert chat(api, "missing").status_code == 404
    assert api.get("/sessions/missing").status_code == 404
    assert chat(api, "missing", message="   ").status_code == 422


def test_stt_preserves_original_and_edit_separately(api, session, transport):
    original = "  Je suis aller au café. \n"

    def handler(request):
        if request.url.host == "api.elevenlabs.io":
            assert b"language_code" in request.content
            return httpx.Response(200, json={"text": original})
        return providers.mock_response(request)

    transport(handler)
    result = transcribe(api, session)
    assert result.status_code == 200
    transcript = result.json()
    assert transcript["original_text"] == original
    edited = "Je suis allé au café."
    assert chat(api, session, message=edited, transcript_id=transcript["id"]).status_code == 200
    messages = api.get(f"/sessions/{session}/messages").json()["messages"]
    assert messages[1]["content"] == edited
    assert messages[1]["original_transcript"] == original
    assert messages[1]["edited_transcript"] == edited
    with main.connect() as db:
        assert db.execute("SELECT original_text FROM transcripts").fetchone()[0] == original
    assert sorted(p.name for p in main.DB_PATH.parent.iterdir()) == ["test.sqlite3"]


def test_transcript_cannot_be_used_by_another_session(api, session):
    transcript_id = transcribe(api, session).json()["id"]
    other = api.post("/sessions", json={"topic": "daily"}).json()["id"]
    assert chat(api, other, transcript_id=transcript_id).status_code == 404
    assert chat(api, session, transcript_id="missing").status_code == 404


@pytest.mark.parametrize("failure", ["status", "timeout", "empty", "type", "json"])
def test_stt_failure(api, session, transport, failure):
    def handler(request):
        if failure == "timeout":
            raise httpx.ReadTimeout("mock", request=request)
        if failure == "status":
            return httpx.Response(500)
        if failure == "json":
            return httpx.Response(200, text="bad json")
        return httpx.Response(200, json={"text": "" if failure == "empty" else 12})

    transport(handler)
    assert transcribe(api, session).status_code == 502
    with main.connect() as db:
        assert db.execute("SELECT COUNT(*) FROM transcripts").fetchone()[0] == 0


def test_stt_validation(api, session):
    assert transcribe(api, session, mime="text/plain").status_code == 415
    assert transcribe(api, session, content=b"").status_code == 413
    assert transcribe(api, session, content=b"x" * (8 * 1024 * 1024 + 1)).status_code == 413
    assert transcribe(api, "missing").status_code == 404


def test_tts_success_is_labeled_synthetic_tone(api):
    response = api.post("/speech/synthesize", json={"text": "Bonjour"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    assert response.headers["cache-control"] == "no-store"
    assert response.content[:4] == b"RIFF"


@pytest.mark.parametrize("failure", ["status", "timeout", "empty", "mime"])
def test_tts_failure(api, transport, failure):
    def handler(request):
        if failure == "timeout":
            raise httpx.ReadTimeout("mock", request=request)
        if failure == "status":
            return httpx.Response(401)
        return httpx.Response(
            200,
            content=b"" if failure == "empty" else b"not audio",
            headers={"Content-Type": "audio/mpeg" if failure == "empty" else "text/html"},
        )

    transport(handler)
    assert api.post("/speech/synthesize", json={"text": "Bonjour"}).status_code == 502


def test_speech_unavailable_preserves_text_chat(api, session, monkeypatch):
    monkeypatch.setattr(providers, "eleven_key", lambda: "")
    assert api.get("/health").json()["speech_ready"] is False
    assert api.get("/health").json()["stt_ready"] is False
    assert transcribe(api, session).status_code == 503
    assert api.post("/speech/synthesize", json={"text": "Bonjour"}).status_code == 503
    assert chat(api, session).status_code == 200


def test_database_survives_application_restart(api, session):
    assert chat(api, session).status_code == 200
    before = api.get(f"/sessions/{session}").json()
    with TestClient(main.app) as restarted:
        assert restarted.get(f"/sessions/{session}").json() == before
    main.init_db()
    assert api.get(f"/sessions/{session}").json() == before


def test_legacy_database_additive_migration(tmp_path, monkeypatch):
    path = tmp_path / "legacy.sqlite3"
    monkeypatch.setattr(main, "DB_PATH", path)
    with sqlite3.connect(path) as db:
        db.execute("CREATE TABLE sessions (id TEXT PRIMARY KEY, topic TEXT, created_at TEXT)")
        db.execute(
            "CREATE TABLE messages (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, "
            "role TEXT, content TEXT, correction TEXT, created_at TEXT)"
        )
        db.execute("INSERT INTO sessions VALUES ('old', 'cafe', '2026-01-01')")
        db.execute(
            "INSERT INTO messages(session_id,role,content,created_at) "
            "VALUES ('old','user','Bonjour','2026-01-01')"
        )
    main.init_db()
    main.init_db()
    with TestClient(main.app) as client:
        messages = client.get("/sessions/old/messages").json()["messages"]
    assert len(messages) == 2
    assert messages[0]["content"] == main.OPENERS["cafe"]
    assert messages[1]["content"] == "Bonjour"


def test_mock_transport_ignores_real_credentials(api, session, monkeypatch, transport):
    monkeypatch.setenv("OPENAI_API_KEY", "must-not-be-used")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "must-not-be-used")
    seen = []

    def handler(request):
        seen.append(request)
        assert "must-not-be-used" not in str(request.headers)
        return providers.mock_response(request)

    transport(handler)
    assert chat(api, session).status_code == 200
    assert transcribe(api, session).status_code == 200
    assert api.post("/speech/synthesize", json={"text": "Bonjour"}).status_code == 200
    assert len(seen) == 3
    assert providers.mock_enabled()


def test_unset_mock_flag_still_uses_mock_transport(api, session, monkeypatch):
    monkeypatch.delenv("MOCK_AI")
    assert providers.mock_enabled()
    assert chat(api, session).json()["mode"] == "mock"


@pytest.mark.parametrize(
    "preferred,legacy,expected",
    [
        ("new-test-key", "old-test-key", "new-test-key"),
        ("  new-test-key  ", "old-test-key", "new-test-key"),
        ("", "old-test-key", "old-test-key"),
        ("   ", "  old-test-key  ", "old-test-key"),
        ("", "", ""),
        ("   ", "   ", ""),
    ],
)
def test_openai_key_resolution(preferred, legacy, expected, monkeypatch):
    monkeypatch.setenv("PARLONS_OPENAI_API_KEY", preferred)
    monkeypatch.setenv("OPENAI_API_KEY", legacy)
    assert providers.configured_openai_key() == expected
    assert providers.mock_enabled()


def test_cloud_secret_is_never_sent_in_mock_mode(api, session, monkeypatch, transport):
    monkeypatch.setenv("PARLONS_OPENAI_API_KEY", "cloud-credential-must-not-be-used")
    calls = []

    def handler(request):
        calls.append(request)
        assert request.headers["authorization"] == "Bearer mock-not-a-secret"
        return providers.mock_response(request)

    transport(handler)
    assert chat(api, session).json()["mode"] == "mock"
    assert len(calls) == 1
    assert api.get("/health").json()["mode"] == "mock"


@pytest.mark.parametrize("status", [401, 403, 429, 500])
def test_openai_http_errors_no_retry_or_partial_turn(api, session, transport, status):
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(status, json={"error": {"message": "fixture failure"}})

    transport(handler)
    result = chat(api, session)
    assert result.status_code == 502
    assert len(calls) == 1
    messages = api.get(f"/sessions/{session}/messages").json()["messages"]
    assert len(messages) == 1
    assert messages[0]["is_opening"] == 1


def test_successful_correction_is_persisted(api, session, transport):
    def handler(request):
        data = providers.mock_response(request).json()
        data["choices"][0]["message"]["content"] = json.dumps(
            {"reply": "Et où êtes-vous allés ?", "correction": "aller 的过去分词是 allé。"}
        )
        return httpx.Response(200, json=data)

    transport(handler)
    result = chat(api, session, message="Je suis aller au café.")
    assert result.status_code == 200
    messages = api.get(f"/sessions/{session}/messages").json()["messages"]
    assert messages[-1]["correction"] == result.json()["correction"]
    assert messages[-1]["content"] == result.json()["reply"]
    assert messages[-2]["content"] == "Je suis aller au café."


@pytest.mark.parametrize("topic", ["daily", "interview", "travel", "cafe"])
def test_all_topics_have_one_persisted_opener(api, topic):
    result = api.post("/sessions", json={"topic": topic})
    assert result.status_code == 200
    session = result.json()
    assert len(session["messages"]) == 1
    assert session["messages"][0]["content"] == main.OPENERS[topic]
    assert chat(api, session["id"]).status_code == 200


def test_health_has_no_credentials(api, monkeypatch):
    monkeypatch.setenv("PARLONS_OPENAI_API_KEY", "private-openai-fixture")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "private-eleven-fixture")
    response = api.get("/health")
    assert "private-openai-fixture" not in response.text
    assert "private-eleven-fixture" not in response.text
    assert response.json()["mock_ai"] is True


def test_translate_is_independent_from_session_history(api, session):
    before = api.get(f"/sessions/{session}/messages").json()["messages"]
    response = api.post("/translate", json={"text": "Bonjour !", "language": "zh"})
    assert response.status_code == 200
    assert response.json()["translation"]
    after = api.get(f"/sessions/{session}/messages").json()["messages"]
    assert after == before


def test_translate_validates_length_and_language(api):
    assert api.post("/translate", json={"text": ""}).status_code == 422
    assert api.post("/translate", json={"text": "a" * 2001}).status_code == 422
    assert api.post("/translate", json={"text": "Salut", "language": "xx"}).status_code == 422
