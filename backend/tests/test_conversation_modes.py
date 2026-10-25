import json
import re
from pathlib import Path

import pytest

from app import main, providers


@pytest.mark.parametrize("language", ["zh", "en"])
@pytest.mark.parametrize("mode", ["guided", "conversation"])
def test_preferences_and_proactive_prompt(api, session, transport, language, mode):
    seen = []

    def handler(request):
        seen.append(json.loads(request.content))
        response = providers.mock_response(request)
        body = response.json()
        body["choices"][0]["message"]["content"] = json.dumps(
            {"reply": "Et ensuite ?", "correction": "example"}
        )
        import httpx

        return httpx.Response(200, json=body)

    transport(handler)
    result = api.post(
        "/chat",
        json={
            "session_id": session,
            "message": "Bonjour",
            "language": language,
            "practice_mode": mode,
        },
    )
    assert result.status_code == 200
    prompt = seen[0]["messages"][0]["content"]
    assert "Prends l’initiative" in prompt and "UNE question" in prompt
    assert ("English" if language == "en" else "Chinese") in prompt
    if mode == "conversation":
        assert result.json()["correction"] == ""
        history = api.get(f"/sessions/{session}").json()["messages"]
        assert not history[-1]["correction"]


def test_review_uses_entire_history_not_only_recent_turns(api, session, monkeypatch):
    for index in range(9):
        assert (
            api.post(
                "/chat",
                json={
                    "session_id": session,
                    "message": f"Bonjour {index}",
                    "practice_mode": "conversation",
                },
            ).status_code
            == 200
        )
    seen = []

    async def review(_app, turns, language):
        seen.extend(turns)
        assert language == "en"
        return providers.SessionReview(summary="A review", strengths=[], corrections=[])

    monkeypatch.setattr(providers, "review_session", review)
    assert api.post(f"/sessions/{session}/review", json={"language": "en"}).status_code == 200
    assert len([turn for turn in seen if turn["role"] == "user"]) == 9
    assert any(turn["content"] == "Bonjour 0" for turn in seen)


def test_review_requires_session_and_at_least_one_user_turn(api, session):
    assert api.post("/sessions/missing/review", json={}).status_code == 404
    assert api.post(f"/sessions/{session}/review", json={}).status_code == 409


@pytest.mark.parametrize("field", ["strengths", "corrections"])
def test_review_rejects_invented_user_quotes(api, session, transport, field):
    api.post("/chat", json={"session_id": session, "message": "Bonjour"})

    def handler(request):
        import httpx

        body = providers.mock_response(request).json()
        review = {"summary": "test", "strengths": [], "corrections": []}
        review[field] = (
            [{"quote": "INVENTED", "reason": "test"}]
            if field == "strengths"
            else [{"original": "INVENTED", "suggestion": "test", "explanation": "test"}]
        )
        body["choices"][0]["message"]["content"] = json.dumps(review)
        return httpx.Response(200, json=body)

    transport(handler)
    assert api.post(f"/sessions/{session}/review", json={}).status_code == 502


def test_review_accepts_grounded_strength_and_correction(api, session, transport):
    api.post("/chat", json={"session_id": session, "message": "Bonjour, je voudrais une café."})

    def handler(request):
        import httpx

        body = providers.mock_response(request).json()
        body["choices"][0]["message"]["content"] = json.dumps(
            {
                "summary": "Practice summary",
                "strengths": [{"quote": "je voudrais", "reason": "Polite request"}],
                "corrections": [
                    {
                        "original": "une café",
                        "suggestion": "un café",
                        "explanation": "Masculine noun",
                    }
                ],
            }
        )
        return httpx.Response(200, json=body)

    transport(handler)
    result = api.post(f"/sessions/{session}/review", json={"language": "en"})
    assert result.status_code == 200
    assert len(result.json()["strengths"]) == len(result.json()["corrections"]) == 1


def test_catalog_is_identical_in_browser_and_backend():
    source = (Path(__file__).parents[2] / "frontend/lib/catalog.ts").read_text()
    pairs = re.findall(r'(id|category|group|zh|en|role|opening):\s*("(?:[^"\\]|\\.)*")', source)
    data = [
        dict((key, json.loads(value)) for key, value in pairs[i : i + 7])
        for i in range(0, len(pairs), 7)
    ]
    assert data == main.CATALOG
    assert len({item["id"] for item in data}) == len(data)


def test_review_rejects_overlong_history_without_silent_truncation(api, session, monkeypatch):
    from unittest.mock import AsyncMock

    review = AsyncMock()
    monkeypatch.setattr(providers, "review_session", review)
    with main.connect() as db:
        for _ in range(60):
            db.execute(
                "INSERT INTO messages(session_id,role,content,created_at) VALUES (?,?,?,?)",
                (session, "user", "x" * 2000, main.now()),
            )
    response = api.post(f"/sessions/{session}/review", json={})
    assert response.status_code == 413
    review.assert_not_called()
