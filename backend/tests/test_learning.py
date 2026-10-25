import json

import httpx

from app import providers


def test_preferences_persist_and_reach_provider(api, transport):
    seen = []

    def handler(request):
        seen.append(json.loads(request.content))
        data = providers.mock_response(request).json()
        data["choices"][0]["message"]["content"] = json.dumps(
            {
                "reply": "Quel obstacle rencontrez-vous ?",
                "correction": "Use the past participle.",
                "corrected_text": "Je suis allé au bureau.",
                "review_prompt": "Describe a visit yesterday.",
            }
        )
        return httpx.Response(200, json=data)

    transport(handler)
    options = {
        "scene": "Project update",
        "situation": "Meeting with a manager",
        "goals": ["Share progress"],
        "focus": "grammar",
        "level": "C1",
        "persona": "challenging",
        "explanation_language": "English",
        "feedback": "after_session",
        "review_targets": ["Je suis allé"],
    }
    session = api.post("/sessions", json={"topic": "interview", "options": options}).json()
    assert session["options"] == options
    assert api.get(f"/sessions/{session['id']}").json()["options"] == options
    response = api.post("/chat", json={"session_id": session["id"], "message": "Je suis aller"})
    assert response.status_code == 200
    instructions = seen[0]["messages"][0]["content"]
    for expected in ("Project update", "grammar", "English", "challenging", "review_targets"):
        assert expected in instructions
    message = api.get(f"/sessions/{session['id']}").json()["messages"][-1]
    assert message["corrected_text"] == "Je suis allé au bureau."
    assert message["review_prompt"] == "Describe a visit yesterday."


def test_invalid_options_rejected(api):
    for options in (
        {"level": "invented"},
        {"focus": "pronunciation"},
        {"goals": ["x" * 201]},
        {"review_targets": ["x"] * 4},
    ):
        assert api.post("/sessions", json={"options": options}).status_code == 422


def test_voice_allowlist_and_provider_selection(api, monkeypatch, transport):
    monkeypatch.setenv("ELEVENLABS_VOICE_WARM", "configured-warm-id")
    catalog = api.get("/voices").json()["voices"]
    assert {"id": "warm", "name": "Warm"} in catalog
    assert "configured-warm-id" not in str(catalog)
    seen = []

    def handler(request):
        seen.append(str(request.url))
        return providers.mock_response(request)

    transport(handler)
    assert (
        api.post("/speech/synthesize", json={"text": "Bonjour", "voice": "arbitrary"}).status_code
        == 422
    )
    assert not seen
    assert (
        api.post("/speech/synthesize", json={"text": "Bonjour", "voice": "warm"}).status_code == 200
    )
    assert seen[0].endswith("/configured-warm-id")
