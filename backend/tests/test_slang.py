"""Mock-only contracts; these do not validate live French or trend popularity."""

import pytest

from app import providers


@pytest.mark.parametrize("language", ["zh", "en"])
def test_slang_fixture_identifies_argot_without_mislabeling_verlan(api, language):
    response = api.post(
        "/rewrite", json={"text": "J’aime cette musique.", "style": "slang", "language": language}
    )
    assert response.status_code == 200
    value = response.json()
    assert value["expression"] == "Je kiffe cette musique."
    assert "kiffer" in value["explanation"]
    assert (
        "不是 verlan" in value["explanation"]
        if language == "zh"
        else "not verlan" in value["explanation"]
    )


def test_no_suitable_mock_slang_keeps_meaning_without_forcing_a_coffee_term(api):
    text = "Je voudrais un café."
    result = api.post("/rewrite", json={"text": text, "style": "slang"}).json()
    assert result["expression"] == text
    assert "不强行造词" in result["explanation"]


def test_legacy_local_style_remains_accepted_as_a_slang_alias(api):
    payload = {"text": "J’aime cette musique.", "language": "en"}
    old = api.post("/rewrite", json={**payload, "style": "local"})
    new = api.post("/rewrite", json={**payload, "style": "slang"})
    assert old.status_code == new.status_code == 200
    assert old.json() == new.json()


def test_slang_failure_preserves_conversation(api, session, monkeypatch):
    before = api.get(f"/sessions/{session}/messages").json()

    async def fail(*args):
        raise ValueError("untrusted upstream content")

    monkeypatch.setattr(providers, "rewrite_expression", fail)
    response = api.post("/rewrite", json={"text": "Bonjour", "style": "slang"})
    assert response.status_code == 502
    assert "untrusted upstream content" not in response.text
    assert api.get(f"/sessions/{session}/messages").json() == before


def test_slang_request_uses_guidance_and_keeps_user_input_as_data(api, transport):
    import json

    from app.slang import SLANG_REGISTER

    calls = []

    def handler(request):
        body = json.loads(request.content)
        calls.append(body)
        return providers.mock_response(request)

    transport(handler)
    response = api.post(
        "/rewrite", json={"text": "J’aime cette musique.", "style": "slang", "language": "en"}
    )
    assert response.status_code == 200
    assert len(calls) == 1
    messages = calls[0]["messages"]
    assert SLANG_REGISTER in messages[0]["content"]
    assert "(English)" in messages[0]["content"]
    assert messages[1] == {"role": "user", "content": "J’aime cette musique."}
    assert response.json()["expression"] == "Je kiffe cette musique."


@pytest.mark.parametrize("kind", ["timeout", "malformed"])
def test_slang_provider_failure_is_mocked_and_does_not_save_feedback(api, session, transport, kind):
    import httpx

    before = api.get(f"/sessions/{session}/messages").json()

    def handler(request):
        if kind == "timeout":
            raise httpx.ReadTimeout("private upstream data", request=request)
        return httpx.Response(200, json={"choices": [{"message": {"content": "not JSON"}}]})

    transport(handler)
    response = api.post("/rewrite", json={"text": "Bonjour", "style": "slang"})
    assert response.status_code == 502
    assert "private upstream data" not in response.text
    assert api.get(f"/sessions/{session}/messages").json() == before


@pytest.mark.parametrize("style", ["polite", "slang"])
def test_full_utterance_rewrite_preserves_other_clauses_in_mock_contract(api, transport, style):
    import json

    original = "Je voudrais une café. Ensuite, je vais retrouver mes amis au cinéma."
    calls = []

    def handler(request):
        calls.append(json.loads(request.content))
        return providers.mock_response(request)

    transport(handler)
    response = api.post("/rewrite", json={"text": original, "style": style, "language": "en"})
    assert response.status_code == 200
    assert calls[0]["messages"][-1]["content"] == original
    assert "ENTIRE user message" in calls[0]["messages"][0]["content"]
    assert "Ensuite, je vais retrouver mes amis au cinéma." in response.json()["expression"]
    assert "un café" in response.json()["expression"]
