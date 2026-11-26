import json

import httpx

from app import providers
from app.scenario_events import EVENTS, scenario_event_prompt


def test_assist_does_not_append_to_conversation(api, session):
    before = api.get(f"/sessions/{session}").json()["messages"]
    hint = api.post("/assist", json={"session_id": session, "mode": "hint"})
    assert hint.status_code == 200
    assert hint.json()["expression"]
    native = api.post(
        "/assist", json={"session_id": session, "mode": "express", "text": "我想喝水"}
    )
    assert native.status_code == 200
    assert api.get(f"/sessions/{session}").json()["messages"] == before
    assert api.post(
        "/assist", json={"session_id": session, "mode": "express", "text": " "}
    ).status_code == 422
    assert api.post(
        "/assist", json={"session_id": "missing", "mode": "hint"}
    ).status_code == 404


def test_every_roleplay_has_two_stable_fictional_events():
    assert len(EVENTS) == 20
    for topic, events in EVENTS.items():
        assert len(set(events)) == 2
        assert scenario_event_prompt(topic, "stable-session", 1) == ""
        now = scenario_event_prompt(topic, "stable-session", 2)
        later = scenario_event_prompt(topic, "stable-session", 3)
        assert any(event in now and event in later for event in events)
        assert "Ne le réintroduis pas" in later
    assert scenario_event_prompt("daily", "stable-session", 2) == ""


def test_category_is_retained_and_unknown_category_is_not_fatal(api, session, transport):
    def handler(request):
        body = providers.mock_response(request).json()
        body["choices"][0]["message"]["content"] = json.dumps({
            "reply": "Très bien.",
            "correction": "Article",
            "corrected_text": "Je voudrais un café.",
            "correction_source": "Je voudrais une café.",
            "correction_details": [{
                "original": "une",
                "suggestion": "un",
                "explanation": "café est masculin.",
                "category": "article",
            }],
        })
        return httpx.Response(200, json=body)

    transport(handler)
    result = api.post(
        "/chat", json={"session_id": session, "message": "Je voudrais une café."}
    )
    assert result.status_code == 200
    assert result.json()["correction_details"][0]["category"] == "article"
    assert providers.CorrectionDetail(
        original="a", suggestion="b", explanation="test", category="unknown"
    ).category is None
