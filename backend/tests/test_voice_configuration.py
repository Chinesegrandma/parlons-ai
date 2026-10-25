import importlib.util
import json
from pathlib import Path

import pytest

from app import providers


def launcher():
    path = Path(__file__).parents[2] / "scripts/run_local.py"
    spec = importlib.util.spec_from_file_location("parlons_launcher", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_startup_uses_default_voice_without_prompt(monkeypatch):
    def no_prompt(*_args):
        raise AssertionError("Voice configuration must not ask for terminal input")

    monkeypatch.setattr("builtins.input", no_prompt)
    module = launcher()
    env = {}
    module.configure_voice(env, {"ELEVENLABS_VOICE_ID": False})
    assert env["ELEVENLABS_VOICE_ID"] == module.DEFAULT_VOICE_ID


def test_startup_preserves_injected_or_dotenv_voice():
    module = launcher()
    env = {"ELEVENLABS_VOICE_ID": "existing-voice"}
    module.configure_voice(env, {"ELEVENLABS_VOICE_ID": True})
    assert env["ELEVENLABS_VOICE_ID"] == "existing-voice"
    env = {}
    module.configure_voice(env, {"ELEVENLABS_VOICE_ID": True})
    assert "ELEVENLABS_VOICE_ID" not in env  # Backend loads the existing .env itself.


def test_multiple_voices_use_aliases_and_hide_provider_ids(api, monkeypatch, transport):
    monkeypatch.setenv(
        "ELEVENLABS_VOICES_JSON",
        json.dumps(
            {
                "claire": {"name": "Claire", "voice_id": "configured-claire"},
                "julien": {"name": "Julien", "voice_id": "configured-julien"},
            }
        ),
    )
    response = api.get("/voices")
    assert {"id": "claire", "name": "Claire"} in response.json()["voices"]
    assert "configured-claire" not in response.text
    seen = []

    def handler(request):
        seen.append(str(request.url))
        return providers.mock_response(request)

    transport(handler)
    assert (
        api.post("/speech/synthesize", json={"text": "Bonjour", "voice": "julien"}).status_code
        == 200
    )
    assert seen[0].endswith("/configured-julien")


@pytest.mark.parametrize(
    "raw", ["not-json", "[]", '{"broken":null}', '{"default":{"name":"X","voice_id":"override"}}']
)
def test_bad_voice_config_keeps_default(api, monkeypatch, raw):
    monkeypatch.setenv("ELEVENLABS_VOICES_JSON", raw)
    assert any(item["id"] == "default" for item in api.get("/voices").json()["voices"])
