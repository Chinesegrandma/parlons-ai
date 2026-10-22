# Parlons AI v0.2 — ElevenLabs speech MVP

**Architecture:** Next.js frontend → FastAPI backend → ElevenLabs (speech-to-text + text-to-speech); OpenAI (optional text tutor/corrections); SQLite local chat history. This is a workflow MVP, **not yet an autonomous agent**.

## Repository structure

```text
backend/
  app/                  # FastAPI application
  tests/                # API tests (no paid API calls)
  requirements.txt
  .env.example
frontend/
  app/                  # Next.js App Router pages and styles
  package.json
  package-lock.json
  tsconfig.json
  .env.local.example
```

The backend stores local chat history in `backend/parlons.sqlite3`.
Local secrets, databases, dependencies, and build outputs are ignored by Git.

## Local setup

Install Python 3.11+ and Node.js 20+ (e.g. `brew install python@3.12 node`).

**Terminal 1:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID only if you need speech.
# Leave keys empty to run text demo mode.
# Optional: add OPENAI_API_KEY for real AI chat/corrections
uvicorn app.main:app --reload --port 8000
```

**Terminal 2:**
```bash
cd frontend
cp .env.local.example .env.local
npm ci
npm run dev
```

Open http://localhost:3000 . Backend API docs: http://localhost:8000/docs . Click microphone once to start recording, again to stop and transcribe; press Send to chat; click Écouter on a tutor message for ElevenLabs audio.

## Configuration

- `ELEVENLABS_API_KEY`: ElevenLabs API key, **server-side only**.
- `ELEVENLABS_VOICE_ID`: French-capable voice ID from your ElevenLabs account; required for TTS.
- `ELEVENLABS_TTS_MODEL`: default `eleven_multilingual_v2` (verify current model availability in your account).
- `ELEVENLABS_STT_MODEL`: default `scribe_v1` (verify current model availability in your account).
- `OPENAI_API_KEY`: optional; **ElevenLabs does not replace the text reasoning model**. Without OpenAI key, the chat uses canned demo replies and does not really correct French.
- `FRONTEND_ORIGIN`: CORS origin, default `http://localhost:3000`.

## Tests

```bash
cd backend
source .venv/bin/activate
python -m pytest -q
```

Test suite uses demo mode and **does not make paid API calls**. Run `npm run build` in `frontend` for a production build check.

## Limitations / security

- Prototype is local-only; no auth or rate limiting, so **do not expose backend publicly**.
- Audio is uploaded to ElevenLabs for transcription; confirm user consent and provider data practices before production use.
- No pronunciation scoring; STT transcripts alone are not reliable pronunciation assessments.
- Browser MediaRecorder formats vary. Chrome on macOS is a good first test; Safari compatibility needs validation.
- Recording is intentionally non-streaming; real-time interruption/turn-taking comes later.
- TTS returns full MP3 bytes; long messages increase latency and usage costs.
- `.env`, database, build artifacts and dependencies are excluded from git/ZIP.
- On failed requests, check server logs; do not paste secrets into chat or GitHub.
- Next step: move from workflow to a bounded tutor agent with learner memory, explicit tools and evals.
