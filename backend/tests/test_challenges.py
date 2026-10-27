"""Mock-only configuration and context contracts, not a language quality evaluation."""

import json
from pathlib import Path

import pytest

from app import providers
from app.challenges import BY_TOPIC, DEFINITIONS


@pytest.mark.parametrize("topic", list(BY_TOPIC))
@pytest.mark.parametrize("seed", [0, 1, 2])
def test_challenge_persists_choices_and_idempotent_opening(api, topic, seed):
    options = {"level": "C1", "challenge": {"seed": seed, "side": "against"}}
    created = api.post("/sessions", json={"topic": topic, "options": options}).json()
    reopened = api.post("/sessions", json={"id": created["id"], "topic": topic}).json()
    assert reopened == created
    assert len(created["messages"]) == 1
    assert created["options"]["challenge"]["seed"] == seed
    if topic != "challenge_describe":
        phrase = BY_TOPIC[topic][1]["seeds"][seed]["fr"]
        assert phrase in created["messages"][0]["content"]
    if topic == "challenge_debate":
        assert "Tu es contre" in created["messages"][0]["content"]


@pytest.mark.parametrize("topic", list(BY_TOPIC))
@pytest.mark.parametrize("mode", ["guided", "conversation"])
def test_challenge_rules_reach_tutor_and_review(api, transport, topic, mode):
    calls = []

    def handler(request):
        calls.append(json.loads(request.content))
        return providers.mock_response(request)

    transport(handler)
    session = api.post("/sessions", json={"topic": topic}).json()["id"]
    assert (
        api.post(
            "/chat",
            json={"session_id": session, "message": "Je pense que oui.", "practice_mode": mode},
        ).status_code
        == 200
    )
    assert "EXPRESSION_CHALLENGE" in calls[0]["messages"][0]["content"]
    assert "SOCIAL_LIFE" not in calls[0]["messages"][0]["content"]
    assert api.post(f"/sessions/{session}/review", json={"language": "en"}).status_code == 200
    assert "Bilan EXPRESSION_CHALLENGE" in calls[-1]["messages"][0]["content"]


@pytest.mark.parametrize("seed", [0, 1, 2])
def test_guessing_target_is_never_given_to_the_model(api, transport, seed):
    calls = []

    def handler(request):
        calls.append(json.loads(request.content))
        return providers.mock_response(request)

    transport(handler)
    session = api.post(
        "/sessions", json={"topic": "challenge_describe", "options": {"challenge": {"seed": seed}}}
    ).json()["id"]
    assert (
        api.post(
            "/chat", json={"session_id": session, "message": "C’est un objet utile."}
        ).status_code
        == 200
    )
    sent = json.dumps(calls[0], ensure_ascii=False)
    for word in ["parapluie", "réfrigérateur", "vélo"]:
        assert word not in sent


@pytest.mark.parametrize(
    "challenge",
    [{"seed": -1}, {"seed": 3}, {"side": "both"}, {"timer_seconds": 30}, {"target": "secret"}],
)
def test_invalid_challenge_configuration_is_rejected(api, challenge):
    assert (
        api.post(
            "/sessions", json={"topic": "challenge_debate", "options": {"challenge": challenge}}
        ).status_code
        == 422
    )


def test_configuration_does_not_override_unrelated_scenes(api):
    assert (
        api.post(
            "/sessions", json={"topic": "cafe", "options": {"challenge": {"seed": 0}}}
        ).status_code
        == 422
    )
    assert (
        api.post(
            "/sessions", json={"topic": "challenge_story", "options": {"situation": "override"}}
        ).status_code
        == 422
    )


def test_public_challenge_definitions_match_browser():
    source = Path(__file__).parents[2] / "frontend/lib/challenges.json"
    assert json.loads(source.read_text()) == DEFINITIONS
