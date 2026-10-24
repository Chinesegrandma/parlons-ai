# Parlons: mobile learning release

## What works

- Practice / Scenes / Notebook navigation, touch-sized controls, and safe-area padding.
- Twelve task-based scenes in Work, Everyday, and Travel, plus free-form custom situations.
- Explicit learner self-checks for scene goals; these are not AI-certified completion.
- Session preferences stored in SQLite and passed to the tutor: level, fluency/grammar/natural
  expression focus, patient/everyday/challenging persona, feedback timing, and Chinese/English/
  French explanation language. Preferences apply to new conversations.
- Structured correction and review-prompt fields, while retaining compatibility with older replies.
- Local notebook: candidate corrections, separate original/sent/suggested text, confirmation,
  editing, deletion, saved expressions, occurrence counts, review due dates, and JSON export.
- Deleted candidates do not reappear when revisiting their source conversation. Repeated mistakes
  bring an existing note back into the due queue. Only confirmed notes are reviewed.
- Self-reported retrieval scheduling at 1/3/7/14/30 days. Revealing an answer does not count as
  remembering it. New-context practice supplies the selected confirmed expression to the tutor.
- Optional voice allowlist: `ELEVENLABS_VOICE_WARM` and `ELEVENLABS_VOICE_CLEAR`, alongside the
  existing default voice. Provider IDs remain on the server. Only configured choices are shown.
- Installable app metadata, 192/512px icons, Apple home-screen icon, and an offline fallback page.
  The service worker caches only that public fallback, not authenticated pages, API data, or audio.

## Install on a phone

Serve the existing app over HTTPS with the backend available, then open Settings and select
“Add Parlons to your phone.” On iPhone use Share → Add to Home Screen; on supported Android
browsers use the install prompt or browser menu. Local desktop development also supports PWA
checks on localhost. A downloaded demo HTML is not an installable hosted app.

The existing private-site gateway should remain enabled for real paid API use. This release
changes neither access control nor rate limits. No public deployment or app-store submission
was performed.

Reference: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable

## Honest boundaries

Notebook and preference storage is browser-local; there are no personal accounts or cross-device
sync. Session content/options still persist in the backend's existing SQLite database. Audio is
not retained for original-recording playback. Text-based feedback cannot score accent, liaison,
nasal vowels, or pronunciation. Spaced-review ratings and task checks are self-assessments.

The demo uses fixed replies, corrections, and a short tone; changes to persona or language do not
magically translate its scripted fixtures. Live tutoring receives those options. Additional voices
need real server configuration and should be chosen and verified for French by the owner.

There is no open community chat, phoneme assessment, native iOS/Android binary, or store listing.
The PWA shell is not an offline AI: connect to use conversation, recognition, and synthesis.
The offline page cannot display the notebook until the app is loaded online again.

## Validation

- 51 frontend tests, TypeScript, ESLint, production Next.js build.
- 110 backend tests including migration compatibility, preference persistence/provider context,
  structured feedback, and voice allowlist/selection. Provider requests used mocks.
- Chromium mobile/desktop UI checks: scenario selection, goals, correction capture, confirmation,
  review, refresh persistence; no page errors or horizontal overflow in checked views.
- Production frontend + FastAPI integration: custom situation/options reach SQLite, chat writes
  both messages, manifest/icon resources load, service worker installs and offline navigation
  displays the fallback. No real iPhone/Android device or paid-provider quality validation.

## Actual screenshots

- [Mobile scenes](design/mobile-scenes.png)
- [Mobile notebook](design/mobile-notebook.png)
- [Mobile review](design/mobile-review.png)
- [Mobile settings](design/mobile-settings.png)
- [Desktop scenes](design/scenes-desktop.png)
- [Desktop notebook](design/notebook-desktop.png)
