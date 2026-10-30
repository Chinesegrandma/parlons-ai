"""Mock regression coverage for current-turn feedback, all edits, and contextual lookup."""

import json

import httpx
import pytest

from app import providers


def response(request, data):
    body = providers.mock_response(request).json()
    body["choices"][0]["message"]["content"] = json.dumps(data)
    return httpx.Response(200, json=body)


SOURCE = "tu utilise quand il pluie"
CORRECTED = "tu utilises quand il pleut"
DETAILS = [
    {"original": "utilise", "suggestion": "utilises", "explanation": "主语 tu 搭配 utilises。"},
    {"original": "pluie", "suggestion": "pleut", "explanation": "下雨用动词 pleuvoir：il pleut。"},
]


def corrected():
    return {
        "reply": "C’est un parapluie ?",
        "correction": "两处用法错误。",
        "corrected_text": CORRECTED,
        "correction_source": SOURCE,
        "correction_details": DETAILS,
    }


def test_all_errors_are_numbered_persisted_and_bound_to_the_learner(api, session, transport):
    calls = []

    def handler(request):
        calls.append(json.loads(request.content))
        return response(request, corrected())

    transport(handler)
    reply = api.post("/chat", json={"session_id": session, "message": SOURCE})
    assert reply.status_code == 200
    assert reply.json()["correction_details"] == DETAILS
    assert "1. utilise" in reply.json()["correction"]
    assert "\n2. pluie" in reply.json()["correction"]
    assert len(calls) == 1
    assert "CHAQUE erreur" in calls[0]["messages"][0]["content"]
    history = api.get(f"/sessions/{session}").json()["messages"]
    assert history[-1]["correction_details"] == DETAILS
    assert history[-1]["feedback_for"] == history[-2]["id"]


def test_previous_turn_correction_is_repaired_once_not_attached_to_confirmation(
    api, session, transport
):
    replies = [corrected(), corrected(), {"reply": "À toi !", "correction": ""}]
    calls = []

    def handler(request):
        calls.append(json.loads(request.content))
        return response(request, replies.pop(0))

    transport(handler)
    assert api.post("/chat", json={"session_id": session, "message": SOURCE}).status_code == 200
    result = api.post("/chat", json={"session_id": session, "message": "oui exactement"})
    assert result.status_code == 200
    assert not result.json()["corrected_text"]
    assert not result.json()["correction_details"]
    assert len(calls) == 3
    assert "FEEDBACK_REPAIR" in calls[-1]["messages"][-1]["content"]


@pytest.mark.parametrize("failure", ["source", "missing_detail", "unrelated", "legacy_repeat"])
def test_invalid_feedback_retry_is_bounded_and_not_persisted(api, session, transport, failure):
    transport(lambda request: response(request, corrected()))
    assert api.post("/chat", json={"session_id": session, "message": SOURCE}).status_code == 200
    calls = []
    data = corrected()
    message = SOURCE
    if failure == "source":
        data["correction_source"] = "Un ancien message."
    elif failure == "missing_detail":
        data["correction_details"] = DETAILS[:1]
    elif failure == "unrelated":
        data["correction_details"] = [
            {"original": "café", "suggestion": "un café", "explanation": "说明"}
        ]
    else:
        data.pop("correction_source")
        data.pop("correction_details")
        message = "oui exactement"

    def handler(request):
        calls.append(request)
        return response(request, data)

    transport(handler)
    result = api.post("/chat", json={"session_id": session, "message": message})
    assert result.status_code == 502
    assert len(calls) == 2
    assert len(api.get(f"/sessions/{session}").json()["messages"]) == 3


def test_two_current_utterances_can_legitimately_have_the_same_corrected_version(
    api, session, transport
):
    data = corrected()
    transport(lambda request: response(request, data))
    assert api.post("/chat", json={"session_id": session, "message": SOURCE}).status_code == 200
    data = {
        **corrected(),
        "correction_source": "tu utilise quand il pleut",
        "correction_details": DETAILS[:1],
    }
    assert (
        api.post(
            "/chat", json={"session_id": session, "message": data["correction_source"]}
        ).status_code
        == 200
    )


def test_lookup_uses_context_without_changing_chat_history(api, session, transport):
    calls = []

    def handler(request):
        calls.append(json.loads(request.content))
        return response(request, {"meaning": "在这里指下雨。", "example": "Il pleut aujourd’hui."})

    transport(handler)
    result = api.post("/lookup", json={"text": "pleut", "context": CORRECTED, "language": "zh"})
    assert result.status_code == 200
    assert "下雨" in result.json()["meaning"]
    sent = json.loads(calls[0]["messages"][-1]["content"])
    assert sent == {"text": "pleut", "context": CORRECTED}
    assert len(api.get(f"/sessions/{session}").json()["messages"]) == 1


@pytest.mark.parametrize(
    "data",
    [
        {"text": " ", "context": " "},
        {"text": "ailleurs", "context": "Bonjour"},
        {"text": "a" * 201, "context": "a" * 201},
        {"text": "Bonjour", "context": "Bonjour", "language": "fr"},
    ],
)
def test_invalid_lookup_inputs_are_rejected_before_provider(api, data, monkeypatch):
    async def forbidden(*args):
        pytest.fail("Invalid lookup must not contact the provider")

    monkeypatch.setattr(providers, "lookup_expression", forbidden)
    assert api.post("/lookup", json=data).status_code == 422


def test_malformed_lookup_is_a_safe_failure(api, transport):
    transport(lambda request: response(request, {"meaning": "", "example": ""}))
    assert api.post("/lookup", json={"text": "Bonjour", "context": "Bonjour"}).status_code == 502


def test_custom_guessing_target_and_expanded_library_never_leak_to_model(api, transport):
    calls = []

    def handler(request):
        calls.append(json.loads(request.content))
        return providers.mock_response(request)

    transport(handler)
    created = api.post(
        "/sessions",
        json={
            "topic": "challenge_describe",
            "options": {"challenge": {"seed": 40, "custom_target": "un accordéon"}},
        },
    )
    assert created.status_code == 200
    session_id = created.json()["id"]
    assert (
        api.get(f"/sessions/{session_id}").json()["options"]["challenge"]["custom_target"]
        == "un accordéon"
    )
    assert (
        api.post(
            "/chat", json={"session_id": session_id, "message": "C’est un instrument."}
        ).status_code
        == 200
    )
    assert "accordéon" not in json.dumps(calls, ensure_ascii=False)
    assert "custom_target" not in json.dumps(calls)


@pytest.mark.parametrize(
    "topic, config",
    [
        ("challenge_describe", {"seed": 1000}),
        ("challenge_story", {"seed": 3}),
        ("challenge_debate", {"custom_target": "secret"}),
        ("challenge_describe", {"custom_target": " "}),
    ],
)
def test_custom_guessing_validation(api, topic, config):
    assert (
        api.post("/sessions", json={"topic": topic, "options": {"challenge": config}}).status_code
        == 422
    )


def test_missing_error_list_is_rejected_even_on_the_first_turn(api, session, transport):
    calls = []

    def handler(request):
        calls.append(request)
        data = corrected()
        data.pop("correction_details")
        data.pop("correction_source")
        return response(request, data)

    transport(handler)
    assert api.post("/chat", json={"session_id": session, "message": SOURCE}).status_code == 502
    assert len(calls) == 2
    assert len(api.get(f"/sessions/{session}").json()["messages"]) == 1


@pytest.mark.parametrize("drop_detail", [False, True])
def test_english_localization_must_preserve_every_error(api, session, transport, drop_detail):
    english = [
        {**DETAILS[0], "explanation": "With tu, utiliser takes -s."},
        {**DETAILS[1], "explanation": "Use the verb pleuvoir: il pleut."},
    ]

    def handler(request):
        payload = json.loads(request.content)
        if "LOCALIZE_FEEDBACK" in payload["messages"][0]["content"]:
            return response(
                request,
                {
                    "correction": "Two verb errors.",
                    "review_prompt": "",
                    "correction_details": english[:1] if drop_detail else english,
                },
            )
        return response(request, corrected())

    transport(handler)
    result = api.post("/chat", json={"session_id": session, "message": SOURCE, "language": "en"})
    assert result.status_code == (502 if drop_detail else 200)
    if not drop_detail:
        assert result.json()["correction_details"] == english
        assert "\n2. pluie" in result.json()["correction"]
