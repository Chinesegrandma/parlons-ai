# Backend preflight review — mock only

Found and fixed a configuration mismatch before real API testing.

## Fixes

- Added `PARLONS_OPENAI_API_KEY`, preferred over legacy `OPENAI_API_KEY`.
  Blank values fall back consistently. Health status, chat routing and the provider
  client share the same resolver. Mock calls never use either credential.
- Trimmed whitespace from ElevenLabs key/voice configuration.
- Strengthened pytest's socket guard: attempted real networking fails teardown
  even if application error handling catches the blocked connection exception.
- Marked `app` as first-party for consistent Ruff import ordering from either directory.
- Updated `.env.example` and README for the cloud-compatible key.

## Results

Commands from `backend`, using the existing cloud virtual environment:

```bash
MOCK_AI=true /workspace/.parlons-ai-env/venv/bin/python -m pytest -q
MOCK_AI=true /workspace/.parlons-ai-env/venv/bin/ruff check --config pyproject.toml app tests ../evaluations
MOCK_AI=true /workspace/.parlons-ai-env/venv/bin/ruff format --config pyproject.toml --check app tests ../evaluations
```

- **62 backend/evaluation tests passed** (baseline: 45).
- Ruff lint/format, Python compilation and Git whitespace checks passed.
- Existing cases cover opening persistence/context, transcript provenance,
  database persistence/migration, and mocked OpenAI/STT/TTS success and failure.
- New regressions cover key precedence/fallback, mock credential isolation,
  provider 401/403/429/500 responses without retries or partial writes, correction
  persistence, all four topic openings and secret-free health responses.
- One upstream Starlette TestClient/httpx deprecation warning remains.

No secrets were printed. No real provider calls, paid calls or deployment occurred.
These results validate mocked code behavior, not credential injection, account
permissions, credits, model availability, network access or real French/speech quality.

README's existing production requirements remain, including authentication,
ownership, quotas, upload protections and chat retry idempotency. Tests cannot
establish that all code is bug-free. Changes are not committed or pushed yet.
