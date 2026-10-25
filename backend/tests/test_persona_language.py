import json

import httpx
import pytest

from app import providers


def test_persona_opening_is_stored_once_and_sent_in_context(api, transport):
    session = api.post("/sessions", json={"topic": "cafe"}).json()
    for _ in range(3):
        history = api.get(f"/sessions/{session['id']}").json()["messages"]
        assert len(history) == 1
        assert history[0]["content"].count("Camille") == 1
    seen = []

    def handler(request):
        seen.append(json.loads(request.content))
        return providers.mock_response(request)

    transport(handler)
    assert (
        api.post("/chat", json={"session_id": session["id"], "message": "Bonjour"}).status_code
        == 200
    )
    assert "Camille" in seen[0]["messages"][1]["content"]
    assert "ne la répète pas" in seen[0]["messages"][0]["content"]


@pytest.mark.parametrize(
    "text",
    ["Le nom café est masculin. Il faut utiliser un café.", "On dit un café.", "请使用阳性冠词。"],
)
def test_obvious_wrong_language_is_detected(text):
    assert providers.feedback_needs_english(text)


@pytest.mark.parametrize(
    "text",
    [
        "Use un café: café is a masculine noun.",
        "Say 'Je voudrais un café, s’il vous plaît'.",
        "Use 'Je suis allé', not 'Je suis aller'.",
    ],
)
def test_english_with_french_examples_is_allowed(text):
    assert not providers.feedback_needs_english(text)


def test_english_feedback_repairs_french_without_translating_reply(api, session, transport):
    seen = []

    def handler(request):
        payload = json.loads(request.content)
        seen.append(payload)
        if "LOCALIZE_FEEDBACK" in payload["messages"][0]["content"]:
            return providers.mock_response(request)
        body = providers.mock_response(request).json()
        body["choices"][0]["message"]["content"] = json.dumps(
            {
                "reply": "Et avec ça ?",
                "correction": "Le nom café est masculin. Il faut utiliser un café.",
                "corrected_text": "Je voudrais un café.",
                "review_prompt": "",
            }
        )
        return httpx.Response(200, json=body)

    transport(handler)
    result = api.post(
        "/chat", json={"session_id": session, "message": "Je voudrais une café.", "language": "en"}
    )
    assert result.status_code == 200
    assert result.json()["reply"] == "Et avec ça ?"
    assert result.json()["corrected_text"] == "Je voudrais un café."
    assert result.json()["correction"] == "Use un café: café is a masculine noun."
    assert result.json()["review_prompt"] == ""
    assert len(seen) == 2
    assert "LANGUAGE CONTRACT" in seen[0]["messages"][0]["content"]
    stored = api.get(f"/sessions/{session}").json()["messages"][-1]
    assert stored["correction"] == result.json()["correction"]


def test_english_feedback_does_not_add_an_extra_request(api, session, transport):
    requests = []

    def handler(request):
        requests.append(request)
        return providers.mock_response(request)

    transport(handler)
    assert (
        api.post(
            "/chat", json={"session_id": session, "message": "Bonjour", "language": "en"}
        ).status_code
        == 200
    )
    assert len(requests) == 1


def test_failed_language_repair_is_bounded_and_does_not_store_french_feedback(
    api, session, transport
):
    requests = []

    def handler(request):
        payload = json.loads(request.content)
        requests.append(payload)
        body = providers.mock_response(request).json()
        feedback = {"correction": "Le nom café est masculin.", "review_prompt": ""}
        if "LOCALIZE_FEEDBACK" not in payload["messages"][0]["content"]:
            feedback.update(reply="Et avec ça ?", corrected_text="Un café.")
        body["choices"][0]["message"]["content"] = json.dumps(feedback)
        return httpx.Response(200, json=body)

    transport(handler)
    response = api.post(
        "/chat", json={"session_id": session, "message": "Une café", "language": "en"}
    )
    assert response.status_code == 502
    assert len(requests) == 2
    assert len(api.get(f"/sessions/{session}").json()["messages"]) == 1


def test_conversation_mode_does_not_translate_hidden_feedback(api, session, transport):
    requests = []

    def handler(request):
        requests.append(request)
        body = providers.mock_response(request).json()
        body["choices"][0]["message"]["content"] = json.dumps(
            {
                "reply": "Et avec ça ?",
                "correction": "Le nom café est masculin.",
                "corrected_text": "Un café.",
                "review_prompt": "",
            }
        )
        return httpx.Response(200, json=body)

    transport(handler)
    response = api.post(
        "/chat",
        json={
            "session_id": session,
            "message": "Une café",
            "language": "en",
            "practice_mode": "conversation",
        },
    )
    assert response.status_code == 200
    assert not response.json()["correction"]
    assert len(requests) == 1
