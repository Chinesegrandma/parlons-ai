# Current-turn feedback, guessing words and contextual lookup

Implemented on `dev`. `main` is unchanged. Development and verification use `MOCK_AI=true`; no real OpenAI/ElevenLabs requests, paid smoke tests or deployment.

## Changes

- Describe & guess has **61** curated targets in six categories: home, food, travel/daily life, nature, people/jobs, and ideas/experiences. Original seed indices 0–2 remain stable for existing sessions. Validation uses the actual activity length; other activities still have three prompts.
- Choose **Add your own** to enter a French target (up to 100 characters). **Save to my words** stores up to 100 entries in this browser; select or remove them later. The selected target is persisted in session options for refresh. The reusable list is localStorage, without account/device/origin sync; a different temporary tunnel address has a different list. Blocked storage is reported and in-memory play still works.
- Both built-in and custom guessing answers are excluded from LLM prompts. `PracticeOptions.prompt()` excludes `challenge.custom_target`; chat and review use clues, not a supplied answer. Explicitly saying the answer in chat will naturally reveal it.
- Expression challenges is the **last** of six home categories.
- Guided feedback requests one structured explanation per modified error, with the current source and the complete corrected utterance. Details are numbered 1, 2, 3 in the card, while legacy stored explanations remain readable. The screenshot fixture `tu utilise quand il pluie` demonstrates `utilise → utilises` and `pluie → pleut` separately.
- A correction must cite the current source, ground every detail’s original/suggestion in the current/corrected message, and explain changed source/output words. A detected mismatch or incomplete feedback gets **at most one** bounded regeneration, then a safe failure with neither message persisted if still invalid. English language repair must preserve all error pairs and translate every explanation. Valid turns still use one chat call; feedback regeneration and the existing language repair can add a call each. Structured feedback adds output tokens; these guards are not a linguistic correctness oracle.
- New assistant rows persist `feedback_for` pointing to the corresponding learner message, plus JSON `correction_details`, within the existing transaction. The database migration is additive. The UI rejects mismatched bindings and suppresses recognizable repeated legacy feedback under a different sentence; it does not silently rewrite old conversations. New sessions reset the message component’s learning/lookup caches.
- Corrected preview phrases have **Listen** and **Copy** actions, available without opening the card. Corrected and rewritten phrases in the card also support these actions; TTS availability and current playback handling remain unchanged.
- Removed the fixed slang mini glossary from the card. Contextual slang rewriting remains.
- Tap a word or select a phrase in an AI message, learner message, corrected preview, or card’s French expressions to open a small lookup panel. Keyboard users can focus a French text block and press Enter (with a selection, or its first word). Accents, apostrophes and hyphens are preserved. Selection crossing highlighted words is supported; selections spanning different messages are intentionally rejected.
- Only **Look up meaning** makes the new `/lookup` request. It sends the selected text, containing sentence and interface language, explains contextual meaning/usage, and can provide a short French example. This is model-assisted explanation, **not web or a cited dictionary search**. Results are cached by text/context/language for the mounted chat; no lookup is written to chat history. Failures can be retried, stale results do not replace a new selection. A lookup does not launch TTS.
- `/lookup` shares the existing private-site authentication, CSRF checks and provider budget with chat/TTS/STT. It validates lengths, nonblank text and membership in the supplied context, and rejects malformed provider results. No new service, dependency or database table.

## Changed files

- Backend: `app/feedback.py`, `main.py`, `providers.py`, `learning.py`, `security.py`, `challenges.json`.
- Frontend: `ChallengeSetup`, `ChallengePanel`, `PracticeHome`, `Studio`, `MessageList`, `CorrectionCard`, new `WordLookup` and `TextActions`; removed `SlangGuide`. Shared types/API/demo, matching challenge definitions, chat/challenge styles updated.
- Tests: new backend `test_feedback_and_lookup.py`, frontend `feedback-and-lookup.test.tsx`; provider/language/persistence/private-site fixtures updated for the structured contract.
- README, challenge documentation, latest standalone demo ZIP and new screenshots.

## Verification

**247 backend tests and 101 frontend tests passed**. Ruff/format, Prettier, ESLint, TypeScript, the mocked 20-example evaluation pipeline and production build passed. The existing Starlette/httpx TestClient deprecation warning remains. All fixtures are labeled mock/demo, not French teaching or speech-quality measurements. Chromium tests exercise actual caret-based word taps, selection spanning highlight nodes, custom words, numbered errors, the later confirmation regression, and responsive widths 320/390/768/1280. Screenshots: `docs/design/guessing-custom-mobile.png`, `numbered-corrections-mobile.png`, `numbered-corrections-desktop.png`, `word-lookup-mobile.png`.

Physical iPhone Safari selection, real model quality, speech quality, API quota availability and costs remain to be tested by the owner.

The app still needs individual accounts, user ownership checks/isolation, per-user quotas, data lifecycle/deletion and backup policies, and a production hosting/monitoring strategy before a multiuser public release. The current tunnel remains a protected single-owner test application.

## Local testing

Download the latest **dev**, extract into a new folder and run inside that project directory:

```sh
python3 scripts/run_local.py --tunnel --port 3200 --api-port 8200
```

This uses mocks. The regular app root is needed for the real backend; an offline HTML or `/demo` uses fixtures. The owner's already-authorized real-mode command is `python3 scripts/run_local.py --tunnel --real --port 3200 --api-port 8200`; this implementation has not executed it. Existing keys in `backend/.env` remain local and ignored by Git. Restarting the old folder will not load these changes.
