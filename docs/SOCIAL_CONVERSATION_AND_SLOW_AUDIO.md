# Social interest and per-message slow playback

Implemented on dev; not merged to main. No deployment or real provider calls.

## Social conversation

Catalog scenes in Social life (free chat, self-introduction, friends, invitations and declining invitations) receive additional conversational guidance in both guided and conversation modes:

- Acknowledge a meaningful personal detail or emotion before optimizing logistics.
- Ask one interested, grounded follow-up; allow one or two natural exchanges, then return to the original plan without forgetting availability already mentioned.
- Do not combine a personal follow-up and scheduling question immediately, interrogate every incidental detail, invent shared memories or force jokes/slang.
- Respect refusals and changes of subject. If the learner wants to settle a time immediately, follow that rather than forcing a digression.
- Self-introduction remains warm as a new acquaintance; other social scenes can be more relaxed with friends.

The implementation adds `backend/app/social.py` guidance after the existing learning preferences in `backend/app/main.py`. Formal categories do not receive it. Custom situations and targeted reviews keep their selected roles, even when their underlying topic ID is daily.

Illustrative rhythm:

Learner: En semaine, je prépare un entretien, donc plutôt samedi.
Camille: Ah, tu prépares un entretien ! C’est pour quel type de poste ?
Learner: Un poste d’ingénieur.
Camille can briefly acknowledge that answer, then return to planning Saturday.

The offline demo contains a specifically labeled/scripted version of this example. This does not demonstrate general language-model understanding, humor quality or personalized empathy. Real conversational quality has not been validated in this task.

## Slow button

Each AI response now has **Listen → 0.8× → Translate → Copy**. Slow playback is disabled along with Listen when TTS is unavailable or continuous voice mode owns playback.

- Listen explicitly plays that message at 1×.
- 0.8× explicitly plays that message at 0.8×, using the browser media playback rate, not another voice/model.
- Neither button changes the global slow preference. Automatic responses, continuous voice and notebook playback continue to use that preference.
- The shared player stops earlier playback and in-flight synthesis when another message is chosen.
- Browser autoplay fallback retries the already loaded audio at its selected rate, without a second synthesis call.

Changes: `frontend/components/MessageList.tsx`, `Studio.tsx`, `frontend/hooks/useSpeech.ts`, and the demo fixture. Buttons still use the same backend synthesis route; ordinary new playback requests may consume existing API credits in real mode.

## Verification

All development used MOCK_AI=true. **191 backend tests and 88 frontend tests passed**, plus Ruff/formatting, Prettier, ESLint, TypeScript and production build. Existing TestClient deprecation warning remains.

Backend tests verify social guidance in both modes, exclusion from formal/custom/review contexts and retention of the personal detail/original scheduling context. They inspect mocked requests rather than claiming to evaluate model-generated tone.

Frontend tests verify action order, normal/slow callbacks, explicit playback rates, unchanged preferences, stopping earlier audio and a cached browser-blocked retry. The offline social fixture is also tested without network access.

Chromium verified the scripted interview-interest-then-scheduling example, actual media play rates 0.8 and 1, unchanged saved preference, four-button order, no overflow at 320/390/1280px, and zero page errors/external requests. Audio is a synthetic tone, not real speech. Physical iOS playback/keyboard and real speech/tutoring quality still require user testing.

Actual screenshots: `docs/design/social-interest-slow.png`, `social-return-to-plans.png`. Updated offline preview: `docs/demo/parlons-inline-learning-demo.zip`.
