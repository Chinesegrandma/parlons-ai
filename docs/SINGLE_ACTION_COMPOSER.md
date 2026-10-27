# Whole-message rewrites and a single recording/send action

Implemented on dev; not merged into main. No deployment or real provider calls.

## Interface changes

- The expression choice is labeled only 俚语 / Slang. The repeated “俚语 / verlan” banner is removed, and the glossary heading is 俚语小词典 / Slang mini guide. Verlan remains a term explained within the glossary, not a second name for the feature.
- More polite and Slang both take the full learner message, including correct clauses and additional sentences. They no longer use a possibly partial corrected_text field as input. The rewrite prompt explicitly prohibits returning only the erroneous fragment, dropping correct clauses or summarizing. Normal correction display remains separate.
- In guided mode there is one persistent button at the right of the composer: microphone → stop → disabled transcription spinner → send arrow. Its DOM element and location remain the same. Stopping finalizes the recording and requests transcription, rather than pausing for later resumption. The draft remains editable and is not sent until the next explicit send action.
- A typed draft also changes this control to Send. Empty input returns it to Record. If STT is unavailable, recording is disabled but typing enables Send. Continuous conversation retains its existing automatic-turn behavior; its manual text composer remains send-only.
- Original transcription is retained independently of edited text. Existing recording duration/size limits, microphone cleanup, text fallback, playback and transcript provenance remain. Repeated stop taps before the browser stop event are ignored, preventing an InvalidStateError.

## Source

`frontend/components/Composer.tsx`, `CorrectionCard.tsx`, `SlangGuide.tsx`, `frontend/hooks/useRecorder.ts`, `frontend/app/chat-learning.css`; full-message prompt and mock fixtures in `backend/app/providers.py`, `backend/app/slang.py` and `frontend/lib/demo.ts`.

Mock fixtures now preserve extra clauses instead of replacing an entire utterance with an unrelated stock help request. They only rewrite configured coffee/music examples and otherwise return clearly labeled fallback content. They do not measure real model quality.

## Verification

`MOCK_AI=true`: **174 backend tests and 83 frontend tests passed**, alongside Ruff/formatting, Prettier, ESLint, TypeScript and production build. Existing TestClient deprecation warning remains.

Regression coverage:

- Same DOM button records, stops, blocks repeated action during STT, permits editing, sends explicitly and returns to Record.
- Original/edited versions remain distinct; text-only functionality works without STT.
- A native asynchronous stop event cannot cause a second stop call.
- Both expression styles receive the complete original message even if corrected_text is only “un café”. Mock requests preserve later correct sentences.
- Backend request transport/schema paths remain mocked; no paid service is contacted.

Chromium standalone demo checked same physical action position, no send on stop, edited transcript send, full-message rewrites, simplified heading and no overflow at 320/390/1280px. Zero external calls or page errors. Demo recording is simulated; real microphone/device keyboard behavior and real transcription/rewrite quality still require user testing.

Screenshots: `docs/design/single-action-{idle,recording,transcript}.png`, `docs/design/whole-message-rewrite.png`.

Preview: download dev, or extract `docs/demo/parlons-inline-learning-demo.zip` and open its HTML (scripted content only). Full app mock command:

```sh
python3 scripts/run_local.py --tunnel --port 3200 --api-port 8200
```
