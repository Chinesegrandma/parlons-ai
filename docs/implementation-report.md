# Parlons AI mock-only implementation report

## Outcome

Implemented the requested critical fixes, component refactor, mock provider tests,
and offline French evaluation tooling. The complete check script exited with status
0. All development and automated checks ran with `MOCK_AI=true`. No real OpenAI or
ElevenLabs API calls, paid API calls, deployment, commit, push or merge were made
as part of this implementation.

## Bugs fixed and architectural decisions

- **Opening/context:** The backend atomically stores the opening with the session.
  Client-generated UUIDs make session creation idempotent; a partial unique SQLite
  index allows at most one opener per session. The browser remembers the UUID and
  reloads backend messages, including through StrictMode and refresh. The opener
  is retained separately from the rolling 12-message LLM context window.
- **Existing data:** Lifespan applies additive schema changes and backfills exactly
  one opener for legacy sessions without removing messages. The migration is
  repeatable. SQLite connections close deterministically and enforce foreign keys.
- **Transcription:** Exact provider text is saved immediately as an immutable
  transcript. The composer exposes it next to an editable draft. Sending references
  its server-owned ID; the backend validates its session and stores original and
  edited text separately. No automatic send occurs after transcription. No raw
  recording is deliberately persisted; uploads are closed and recording resources
  released. Multipart parsing can temporarily spool request data to disk.
- **Playback:** Generated replies autoplay when enabled and speech is configured.
  Preferences persist locally, including 0.8x playback. Browser gesture rejection
  exposes a manual retry using existing audio. New requests stop old audio, cancel
  pending fetches, release object URLs and reject stale completions. Disabling
  autoplay while a chat is pending is respected.
- **Speech status:** Backend `speech_ready` controls playback; `stt_ready` controls
  recording. Text chat remains usable when either is unavailable. These fields
  describe configuration, not live provider availability.
- **Mock isolation:** Mock mode defaults on and ignores real credentials. All three
  provider operations use an in-memory HTTP transport, including OpenAI SDK response
  parsing. Mock STT and chat are fixed fixtures; mock audio is a short tone, not
  speech. Backend tests also deny socket connections; frontend tests reject
  unmocked fetches and simulate media APIs.
- **Maintainability:** Page composition, UI components, session management, recording,
  playback and typed API access are separated. Runtime/dev Python requirements are
  split and duplicate httpx removed. FastAPI uses lifespan instead of on_event.

## Verification executed

Command from the repository root in this cloud workspace:

```bash
MOCK_AI=true PARLONS_PYTHON=/workspace/.parlons-ai-env/venv/bin/python \
  bash scripts/check.sh
```

| Check | Result |
| --- | --- |
| Ruff lint, app/tests/evaluations | Passed |
| Ruff format check, 10 Python files | Passed |
| Backend and evaluator pytest | **45 passed** |
| Prettier format check | Passed |
| ESLint, zero warnings permitted | Passed |
| TypeScript `tsc --noEmit` | Passed |
| React/jsdom Vitest | **30 passed**, 4 test files |
| Next.js production build | Passed |
| Offline evaluator CLI | Passed using labeled mock predictions |
| Git whitespace check | Passed |

The backend test run emits one upstream Starlette TestClient/httpx deprecation
warning. The application itself no longer uses deprecated FastAPI startup handlers.

Backend coverage includes OpenAI success, timeout and malformed replies; STT and
TTS success, upstream errors, timeouts and invalid data; upload validation;
transcript/session boundaries; opening context after long conversations; database
restart persistence; legacy migration; and mock credential isolation.

Frontend coverage includes refresh/StrictMode session restoration, separate
original/edited transcripts, retained failed drafts, recorded transcript review,
autoplay and its preference switch, 0.8x playback, browser rejection/manual retry,
text-only fallback, overlapping and out-of-order audio, permission denial, cancelled
recordings/transcriptions, microphone release, recording duration/size limits and
IME input handling.

## Evaluation dataset and interpretation

Exactly 20 hand-authored cases: 3 grammar, 3 conjugation, 4 gender agreement,
6 correct sentences that should not be corrected, and 4 pronunciation prompts.
The pronunciation prompts have offline eSpeak-generated French WAV fixtures with
reference transcripts, generation provenance and SHA-256 fingerprints. These are
synthetic speech, not learner recordings. The mock STT API test bytes are explicitly
not speech and are not used for WER.

The offline scorer reports correction detection precision/recall, false-positive
correction rate, supplementary exact corrected-sentence matching, coverage, and
micro WER for fingerprinted audio/reference pairs. Missing predictions and undefined
denominators produce unrun/null results, not invented perfect scores. Text-only
cases cannot produce a speech score.

The included **scripted** predictions intentionally include errors. Their arithmetic
results are precision 0.8, recall 0.4, false-positive rate 0.1, and 1 word error over
19 reference words across 4 synthetic fixtures. **These are test vectors, not model
quality measurements. No real correction, pronunciation or ASR quality has been
validated.** Chinese explanation quality requires separate human review.

## Files changed or added

Backend:

- `backend/app/main.py`
- `backend/app/providers.py`
- `backend/.env.example`
- `backend/requirements.txt`
- `backend/requirements-dev.txt`
- `backend/pyproject.toml`
- `backend/tests/conftest.py`
- `backend/tests/test_api.py`
- `backend/tests/test_evaluation.py`

Frontend application:

- `frontend/app/page.tsx`
- `frontend/app/globals.css`
- `frontend/app/layout.tsx` (formatting)
- `frontend/components/Composer.tsx`
- `frontend/components/MessageList.tsx`
- `frontend/components/PlaybackControls.tsx`
- `frontend/components/TopicSidebar.tsx`
- `frontend/hooks/useConversation.ts`
- `frontend/hooks/useRecorder.ts`
- `frontend/hooks/useSpeech.ts`
- `frontend/lib/api.ts`
- `frontend/lib/types.ts`

Frontend tooling and tests:

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/tsconfig.json` (formatting)
- `frontend/.prettierignore`
- `frontend/eslint.config.mjs`
- `frontend/vitest.config.ts`
- `frontend/tests/setup.ts`
- `frontend/tests/conversation.test.tsx`
- `frontend/tests/page.test.tsx`
- `frontend/tests/recorder.test.tsx`
- `frontend/tests/useSpeech.test.tsx`

Evaluation and documentation:

- `evaluations/__init__.py`
- `evaluations/evaluate.py`
- `evaluations/french_cases.json`
- `evaluations/fixtures/mock_predictions.json`
- `evaluations/fixtures/audio/fr-17.wav`
- `evaluations/fixtures/audio/fr-18.wav`
- `evaluations/fixtures/audio/fr-19.wav`
- `evaluations/fixtures/audio/fr-20.wav`
- `evaluations/generate_audio_fixtures.py`
- `evaluations/requirements-fixtures.txt`
- `evaluations/README.md`
- `scripts/check.sh`
- `README.md`
- `docs/implementation-report.md`

## Known limitations

- Real provider behavior, quality, latency, costs and account/model availability
  remain untested. Synthetic speech is not representative learner evaluation data.
- jsdom media mocks do not replace physical microphone, real codec, mobile browser
  and autoplay-policy QA. No pronunciation scoring is implemented.
- Unsent drafts are lost on reload; stored original transcript text remains in
  SQLite, including discarded drafts, pending a retention/deletion policy.
- Session restoration relies on browser local storage; cross-device restoration
  and authenticated ownership are not implemented.
- Chat submissions are not server-idempotent. An ambiguous network failure after
  persistence can cause duplicate turns on retry; session creation is idempotent.
- Context is bounded without long-term learner memory. Transcript normalization by
  the STT provider can hide learner mistakes; text correction cannot assess speech.

## Remaining production security requirements

Before public exposure, implement authentication, authorization and per-user
session/transcript ownership; rate limits, quotas and abuse/billing controls;
HTTPS, reviewed origins and secure server-side secrets; request-level streaming
upload limits and actual audio-content validation; serialized/idempotent chat
turns; consent, provider data/retention review, transcript/history deletion and
backup policies; privacy-safe logs/monitoring; and dependency, browser,
accessibility and security reviews. Current endpoint UUIDs are not authorization.

## Approval boundary

All mock checks have passed. Work stops before any real provider smoke tests.
Explicit user approval is required before disabling mock mode or making any real
OpenAI or ElevenLabs calls. Nothing has been deployed.
