# Expression challenges

Implemented on dev, without merging main or making real provider calls.

## Four activities

| Activity | Practice | First version |
|---|---|---|
| One-minute opinion | View, reason, example | Three prompts; optional pausable timer; no speed grade |
| Describe & guess | Circumlocution through function, appearance and context | Three target words, shown only in the learner's guide; AI guesses from clues |
| Story relay | Coherent narration and tense | Three story seeds; alternate one or two sentences, request an ending when ready |
| Discussion & debate | Reasons, rebuttals and concessions | Three propositions; choose for/against, AI takes the other side; no winner score |

The home has a dedicated Expression challenges block. Select an activity, prompt and task difficulty, then explicitly start. Setup does not create a session or call a model. Difficulty offers A1–A2 support, B1–B2 independent expression and C1 nuance; these are practice settings, not a measured CEFR level.

In chat, a compact guide shows rules and the current seed. “Next prompt · new chat” cycles the three starter prompts and explicitly creates a new conversation; prior messages stay in the database. Next round is disabled while there is an unsent draft, active recording or continuous voice session, preventing accidental loss. Choices, level and side are persisted in session options and survive refresh. The optional timer's elapsed state is local and resets on refresh/new session. It pauses when the page is hidden, does not submit text or stop recording, and does not impose a speed assessment. Existing 60-second per-recording limits still apply; longer answers can use multiple turns.

Single-button recording/transcript editing/send, continuous conversation, normal and 0.8× playback, translations, copy, inline correction, notebook and end review remain available. Continuous mode still saves per-turn corrections for the final review.

## Backend design

Four additive catalog IDs: challenge_opinion, challenge_describe, challenge_story, challenge_debate. No new endpoints, database tables or provider services.

`ChallengeOptions` (seed 0–2, debate side, timer 0/60) is optional within existing session options. Non-challenge sessions cannot receive it; challenge sessions cannot mix in custom situation/review-target overrides. Legacy options serialization excludes the new null field, preserving the existing API shape.

The backend derives an opening and rules from saved choices, retaining idempotent persisted openings. The same chat request includes activity-specific guidance. The existing review request gets corresponding review criteria, with evidence tied to the learner's actual words. Opinion focuses on reasoning/examples; description on useful clues; story on coherence/tense; debate on argument/responding/conceding. No pronunciation, time-compliance, winner or automatic proficiency claims.

### Guessing integrity

The target word exists in the UI's setup/guide and the application's local definitions. The chat request includes only the seed index, generic rules, history and the learner's clues; it never adds the target word as an answer to the model prompt. Tests inspect all three target cases. If the learner explicitly says the target in a message, it naturally becomes part of the conversation. AI guesses are hypotheses, with confirmation left to the learner.

## Files

- `backend/app/catalog.json`, `frontend/lib/catalog.ts`: four activities in the shared scene catalog.
- `backend/app/challenges.json`, `frontend/lib/challenges.json`: matching bilingual definitions and three seeds per activity; a test checks equality.
- `backend/app/challenges.py`: openings, activity guidance and review criteria.
- `backend/app/learning.py`, `main.py`, `providers.py`: optional settings, validation, persistence, tutoring and review integration.
- `frontend/components/ChallengeSetup.tsx`, `ChallengePanel.tsx`: setup, guide, optional timer and new round.
- `frontend/components/PracticeHome.tsx`, `Studio.tsx`, `frontend/lib/types.ts`, `challenges.ts`, `demo.ts`: navigation and existing conversation integration.
- `frontend/app/challenges.css`, `layout.tsx`, `frontend/scripts/build-demo.mjs`: themed styles for app and standalone preview.
- `backend/tests/test_challenges.py`, `frontend/tests/challenges.test.tsx`: regression coverage.

## Verification

MOCK_AI=true: **225 backend tests and 92 frontend tests passed**; Ruff/formatting, Prettier, ESLint, TypeScript, fixture evaluation and production build passed. Existing TestClient deprecation warning remains.

Tests cover choice persistence, unique openings, prompt/review integration in both modes, guessing-target exclusion, invalid config rejection, ordinary-scene compatibility, matching browser/server definitions, explicit setup and a pausable timer that never forces a new round.

Chromium standalone preview checked all four activities, topic/side selection, timer start/pause, new round, target only in the guide, chat and review, composer visibility and no horizontal overflow at 320/390/768/1280px. No page errors or external requests.

Screenshots: `docs/design/challenges-hub-mobile.png`, `challenges-opinion-setup.png`, `challenges-opinion-chat.png`, `challenges-describe-chat.png`, `challenges-debate-chat.png`.

## Limits and testing

This version has three curated starter seeds per activity, not an infinite curriculum, adaptive progression or automatic task-completion scoring. Model replies vary dynamically in real mode; mock replies are scripted, including the game examples. No real French teaching, story quality, debate factual accuracy or speech-recognition quality was validated. Physical phone behavior and live model behavior still require user testing. Ordinary chat retains its existing opening-plus-recent-12-message context; very long stories do not gain a new long-term plot memory in this release. In-memory timer progress is not a performance measurement.

Download dev and first test without spending API credits:

```sh
python3 scripts/run_local.py --tunnel --port 3200 --api-port 8200
```

Open the newly printed URL/password. The standalone ZIP at `docs/demo/parlons-inline-learning-demo.zip` is also updated; extract and open HTML to explore the UI with fixtures, no providers or microphone.
