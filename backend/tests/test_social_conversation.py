"""Prompt/context contracts only; real conversational quality is not evaluated."""

import json

import pytest

from app import providers
from app.social import SOCIAL_CONVERSATION


@pytest.mark.parametrize("topic", ["daily", "friends", "invite", "decline", "self_intro"])
@pytest.mark.parametrize("mode", ["guided", "conversation"])
def test_social_interest_guidance_is_present_in_both_modes(api, transport, topic, mode):
    calls = []

    def handler(request):
        calls.append(json.loads(request.content))
        return providers.mock_response(request)

    transport(handler)
    session = api.post("/sessions", json={"topic": topic}).json()["id"]
    text = "En semaine, je prépare un entretien, donc plutôt samedi."
    result = api.post("/chat", json={"session_id": session, "message": text, "practice_mode": mode})
    assert result.status_code == 200
    assert SOCIAL_CONVERSATION in calls[0]["messages"][0]["content"]
    assert calls[0]["messages"][-1] == {"role": "user", "content": text}


@pytest.mark.parametrize("topic", ["bank_card", "doctor", "teacher", "interview"])
def test_formal_scenarios_do_not_acquire_friend_guidance(api, transport, topic):
    calls = []

    def handler(request):
        calls.append(json.loads(request.content))
        return providers.mock_response(request)

    transport(handler)
    session = api.post("/sessions", json={"topic": topic}).json()["id"]
    assert api.post("/chat", json={"session_id": session, "message": "Bonjour"}).status_code == 200
    assert "SOCIAL_LIFE" not in calls[0]["messages"][0]["content"]


@pytest.mark.parametrize(
    "options",
    [
        {"situation": "Formal interview with an employer"},
        {"review_targets": ["Je souhaiterais ouvrir un compte."]},
    ],
)
def test_custom_and_review_situations_keep_their_selected_role(api, transport, options):
    calls = []

    def handler(request):
        calls.append(json.loads(request.content))
        return providers.mock_response(request)

    transport(handler)
    session = api.post("/sessions", json={"topic": "daily", "options": options}).json()["id"]
    assert api.post("/chat", json={"session_id": session, "message": "Bonjour"}).status_code == 200
    assert "SOCIAL_LIFE" not in calls[0]["messages"][0]["content"]


def test_followup_context_preserves_personal_detail_and_original_agenda(api, transport):
    calls = []

    def handler(request):
        calls.append(json.loads(request.content))
        return providers.mock_response(request)

    transport(handler)
    session = api.post("/sessions", json={"topic": "invite"}).json()["id"]
    first = "En semaine, je prépare un entretien, donc plutôt samedi."
    assert api.post("/chat", json={"session_id": session, "message": first}).status_code == 200
    assert (
        api.post(
            "/chat", json={"session_id": session, "message": "Un poste d’ingénieur."}
        ).status_code
        == 200
    )
    assert any(item["role"] == "user" and item["content"] == first for item in calls[1]["messages"])
    assert calls[1]["messages"][-1]["content"] == "Un poste d’ingénieur."
