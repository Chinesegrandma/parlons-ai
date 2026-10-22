# Parlons AI — French speaking practice

Next.js frontend → FastAPI backend → OpenAI for text tutoring and ElevenLabs for
STT/TTS. SQLite retains conversation and transcript text. This is a local
prototype, not a production deployment or a validated language assessment tool.

**Development defaults to `MOCK_AI=true`. Do not disable it or run real provider
smoke tests until explicitly approved. No real API calls are needed for setup,
tests, builds, or the included offline evaluations.**

## Features

- A backend-owned opening message is saved atomically with each session and always
  included in LLM context alongside the most recent 12 non-opening messages.
- The browser remembers the session ID. Refresh resumes its stored history;
  idempotent session creation and a unique database index prevent duplicate openers,
  including React StrictMode retries. “New session” explicitly creates another ID.
- Microphone recordings are transcribed into a **reviewable draft**, never sent
  automatically. The exact provider transcript is immutable in SQLite; the edited
  message is stored separately when sent. History exposes both versions.
- Raw recording blobs are released after upload and are not deliberately saved by
  the app. Multipart parsing may use temporary spooled files, closed after each
  request. Provider-side retention is separate and needs review before real use.
- AI replies play automatically when speech is available. Autoplay can be disabled;
  slow playback uses 0.8× speed. Both preferences persist locally. A browser autoplay
  rejection exposes a manual “Play response” button using the already-fetched audio.
  New playback cancels pending synthesis and stops old audio. Audio stops when
  recording or changing sessions, and on unmount.
- `/health` supplies `speech_ready` for playback and `stt_ready` for recording.
  Missing speech configuration disables the relevant controls while keeping text
  chat usable. Status indicates configured capabilities, not a live provider probe.
- Mock STT returns a fixed sentence; mock tutoring returns a fixed reply without
  correction; mock TTS produces a short synthetic **tone, not spoken French**.

## Repository structure

```text
backend/
  app/main.py             # HTTP API, lifespan, SQLite persistence and migration
  app/providers.py        # Validated provider responses and network-free mock transport
  tests/                  # API, persistence and offline evaluator regression tests
  requirements.txt        # Runtime dependencies
  requirements-dev.txt    # Runtime + pytest and Ruff
  .env.example
frontend/
  app/                    # Page composition, layout and styles
  components/             # Topics, transcript composer, messages and playback settings
  hooks/                  # Session state, recording and audio lifecycle
  lib/                    # Typed API client and shared types
  tests/                  # React/jsdom interaction and lifecycle tests
  package-lock.json
  .env.local.example
evaluations/
  french_cases.json       # 20 hand-authored French examples
  fixtures/audio/         # 4 labeled offline synthetic speech WAV fixtures
  fixtures/mock_predictions.json # Scripted scorer inputs, not provider outputs
  evaluate.py             # Offline metrics; never calls a provider
scripts/check.sh          # Complete checks with mock mode forced on
```

## Local setup

Requires Python 3.11+ and Node.js 20.9+ (Node 22 or 24 LTS recommended).
Commands below are run from the repository root unless noted. Do not overwrite
existing local environment files; copy examples only when the target is absent.

Backend, terminal 1:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
# Optional: cp .env.example .env (only if .env does not exist)
MOCK_AI=true uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend, terminal 2:

```bash
cd frontend
npm ci
# Optional: cp .env.local.example .env.local (only if it does not exist)
MOCK_AI=true npm run dev -- --hostname 127.0.0.1 --port 3000
```

Use the local frontend on port 3000, with browser origin `http://localhost:3000`
matching the default backend CORS setting. Backend documentation is at `/docs` on
port 8000. No API keys are required in mock mode. `MOCK_AI` is enforced by the
backend; the frontend displays the backend's mode and readiness flags.

The default database is `backend/parlons.sqlite3`; `DATABASE_PATH` can override it.
Startup uses FastAPI lifespan and applies an additive, repeatable migration for
v0.2 databases, preserving old messages and adding one opening per old session.
Back up any valuable database before a version upgrade.

## Configuration

| Variable | Meaning |
| --- | --- |
| `MOCK_AI` | Defaults to `true`; only the explicit value `false` enables live provider paths. Keep `true` throughout development and tests. |
| `PARLONS_OPENAI_API_KEY` | Preferred server-side key name, supported by cloud network secrets; used only with mock mode disabled. Without either key, live-mode text chat uses canned demo replies. |
| `OPENAI_API_KEY` | Legacy local configuration fallback. A nonblank `PARLONS_OPENAI_API_KEY` takes priority. The cloud secret configuration reserves the `OPENAI_` prefix. |
| `OPENAI_MODEL` | Text model; default `gpt-4.1-mini`. |
| `ELEVENLABS_API_KEY` | Server-side key for real STT/TTS, ignored in mock mode. |
| `ELEVENLABS_VOICE_ID` | French-capable voice for real TTS. |
| `ELEVENLABS_TTS_MODEL` | Default `eleven_multilingual_v2`; check account availability before real tests. |
| `ELEVENLABS_STT_MODEL` | Default `scribe_v1`; check account availability before real tests. |
| `FRONTEND_ORIGIN` | Default `http://localhost:3000`. |
| `NEXT_PUBLIC_API_URL` | Public backend URL, default `http://localhost:8000`; never place keys here. |
| `DATABASE_PATH` | Optional SQLite path; its parent directory must exist. |

## Automated checks — mock mode only

Install backend development and frontend dependencies first. From the root:

```bash
PARLONS_PYTHON="$PWD/backend/.venv/bin/python" bash scripts/check.sh
```

Or run separately:

```bash
cd backend
MOCK_AI=true .venv/bin/python -m pytest -q
MOCK_AI=true .venv/bin/python -m ruff check --config pyproject.toml app tests ../evaluations
MOCK_AI=true .venv/bin/python -m ruff format --config pyproject.toml --check app tests ../evaluations
cd ../frontend
MOCK_AI=true npm run format:check
MOCK_AI=true npm run lint
MOCK_AI=true npm run typecheck
MOCK_AI=true npm test
MOCK_AI=true NEXT_TELEMETRY_DISABLED=1 npm run build
```

Formatting: run the Ruff command without `--check`, and `npm run format`.
Stop the frontend dev server before building in the same directory. Do not run
`npm ci` concurrently with frontend builds or services.

Backend tests force mock mode, use in-memory HTTP transports, block socket
connections and isolate SQLite in temporary directories. Frontend tests use jsdom,
mocked media APIs, and a default rejecting fetch stub. They do not contact backend
or external services. An upstream Starlette TestClient/httpx deprecation warning
may appear; app startup itself no longer uses deprecated `on_event` handlers.

## Language evaluation

See [evaluations/README.md](evaluations/README.md) for input formats, formulas,
coverage reporting and audio provenance. Run from the root:

```bash
MOCK_AI=true python3 evaluations/evaluate.py
MOCK_AI=true python3 evaluations/evaluate.py \
  --predictions evaluations/fixtures/mock_predictions.json
```

The first command reports no evaluated predictions and null scores. The second
checks arithmetic with **hand-scripted mock outputs** and labeled synthetic audio;
its numbers are not real correction or recognition-quality measurements. Speech
scoring requires actual audio, its matching fingerprint and a reference transcript.
Text-only pronunciation prompts are never counted as speech recognition tests.

## Known limitations

- Real OpenAI corrections, French voice quality, STT accuracy, costs and provider
  latency have not been evaluated. There are no pronunciation scores.
- The starter dataset and synthetic eSpeak speech are not representative learner
  recordings. Real quality needs consented recordings and independently reviewed
  reference transcripts/correction labels.
- jsdom tests simulate playback restrictions and recording. Physical microphones,
  codecs, mobile browsers and real browser autoplay policies still need manual QA.
- Unsent drafts are held in page memory and are lost on refresh. Stored transcript
  text remains in the database, including discarded drafts, until a retention policy
  is implemented. Browser session restoration needs working local storage.
- Chat submission has no server-side idempotency key: an ambiguous network failure
  after commit can require checking history before retrying. Only session creation
  is idempotent. History context is bounded, without long-term learner memory.
- Health flags describe configuration/mock capabilities, not provider availability.
- Uploads are limited to 8 MB; browser recording stops after 60 seconds. Recognition
  may normalize mistakes; correcting transcript text does not evaluate pronunciation.

## Before production

Do not expose this prototype publicly. Add authentication and per-user ownership
checks for sessions/transcripts, authorization tests, rate limits, quotas and abuse
controls, HTTPS and correct origin restrictions, and secure secrets management.
Add streaming/request-level upload limits (before multipart buffering), audio
content validation, concurrent-turn controls and idempotent chat submissions.
Establish consent, provider retention/data-processing settings, transcript/history
retention and deletion, access-controlled backups and privacy-safe monitoring.
Review dependency advisories and run browser/accessibility/security testing before
release. Never send API keys to the browser or commit them.

No deployment or real provider smoke test is part of the current verification.
