"""Provider boundaries. Mock mode uses an in-memory transport, never the network."""

import io
import json
import os
import wave
from contextlib import asynccontextmanager

import httpx
from openai import AsyncOpenAI
from pydantic import BaseModel, ConfigDict, Field


def mock_enabled() -> bool:
    return os.getenv("MOCK_AI", "true").strip().lower() != "false"


def mock_audio() -> bytes:
    """A short synthetic tone, not speech and not a recognition-quality fixture."""
    import math
    import struct

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(16000)
        audio.writeframes(
            b"".join(
                struct.pack("<h", int(2000 * math.sin(2 * math.pi * 440 * i / 16000)))
                for i in range(3200)
            )
        )
    return buffer.getvalue()


def mock_response(request: httpx.Request) -> httpx.Response:
    if request.url.host == "api.openai.com":
        return httpx.Response(
            200,
            json={
                "id": "mock-chat",
                "object": "chat.completion",
                "created": 0,
                "model": "mock",
                "choices": [
                    {
                        "index": 0,
                        "finish_reason": "stop",
                        "message": {
                            "role": "assistant",
                            "content": json.dumps(
                                {
                                    "reply": "Merci ! Peux-tu m’en dire un peu plus ?",
                                    "correction": "",
                                }
                            ),
                        },
                    }
                ],
            },
        )
    if request.url.host == "api.elevenlabs.io":
        if request.url.path.endswith("/speech-to-text"):
            return httpx.Response(200, json={"text": "Bonjour, je voudrais un café."})
        if "/text-to-speech/" in request.url.path:
            return httpx.Response(200, content=mock_audio(), headers={"Content-Type": "audio/wav"})
    raise RuntimeError("Unexpected mock destination")


@asynccontextmanager
async def provider_http(app):
    # Overrides are accepted only in mock mode, so test transports cannot leak into live mode.
    transport = None
    if mock_enabled():
        transport = getattr(app.state, "provider_transport", None) or httpx.MockTransport(
            mock_response
        )
    async with httpx.AsyncClient(transport=transport, timeout=45) as http:
        yield http


class TutorReply(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    reply: str = Field(min_length=1, max_length=1200)
    correction: str = Field(max_length=2000)


def configured_openai_key() -> str:
    """Prefer the cloud-compatible name; retain local .env compatibility.

    Do not log this return value. Mock provider calls never use either credential.
    """
    return (
        os.getenv("PARLONS_OPENAI_API_KEY", "").strip() or os.getenv("OPENAI_API_KEY", "").strip()
    )


async def tutor_reply(app, messages: list[dict]) -> TutorReply:
    async with provider_http(app) as http:
        client = AsyncOpenAI(
            api_key="mock-not-a-secret" if mock_enabled() else configured_openai_key(),
            http_client=http,
            max_retries=0,
        )
        result = await client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.6,
            timeout=25,
        )
        content = result.choices[0].message.content
        reply = TutorReply.model_validate_json(content or "")
        if not reply.reply.strip():
            raise ValueError("Empty reply")
        return reply


def eleven_key() -> str:
    return "mock-not-a-secret" if mock_enabled() else os.getenv("ELEVENLABS_API_KEY", "").strip()


def voice_id() -> str:
    return "mock-voice" if mock_enabled() else os.getenv("ELEVENLABS_VOICE_ID", "").strip()


async def speech_to_text(app, filename: str, data: bytes, mime: str) -> str:
    async with provider_http(app) as http:
        response = await http.post(
            "https://api.elevenlabs.io/v1/speech-to-text",
            headers={"xi-api-key": eleven_key()},
            data={
                "model_id": os.getenv("ELEVENLABS_STT_MODEL", "scribe_v1"),
                "language_code": "fra",
            },
            files={"file": (filename, data, mime)},
        )
        response.raise_for_status()
        text = response.json().get("text")
        if not isinstance(text, str) or not text.strip() or len(text) > 2000:
            raise ValueError("Invalid transcript")
        return text  # Preserve the provider's exact text, including whitespace.


async def text_to_speech(app, text: str) -> tuple[bytes, str]:
    async with provider_http(app) as http:
        response = await http.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id()}",
            headers={"xi-api-key": eleven_key(), "Accept": "audio/mpeg"},
            json={
                "text": text,
                "model_id": os.getenv("ELEVENLABS_TTS_MODEL", "eleven_multilingual_v2"),
                "voice_settings": {"stability": 0.55, "similarity_boost": 0.75},
            },
        )
        response.raise_for_status()
        mime = response.headers.get("content-type", "").split(";")[0]
        if not response.content or mime not in {"audio/mpeg", "audio/wav"}:
            raise ValueError("Invalid audio response")
        return response.content, mime
