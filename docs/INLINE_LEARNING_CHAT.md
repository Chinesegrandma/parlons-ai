# Conversation layout preview: inline learning and desktop rail

Branch: `design/inline-learning-chat`. Based on the latest main (`a7bebd8`), including its existing translation / rewrite features. This implementation is not merged into main.

## Layout

- One header row: back, Camille avatar/name/scene, dark outlined Finish & review. Clicking Camille's chevron opens the existing settings, notebook, connection status and logout navigation. This preserves those functions without a second permanent toolbar.
- Compact guided/conversation segmented control. No separate identity row, brand slogan, composer instructions or Scripted replies paragraph in the conversation viewport. Mock mode retains a small Demo badge to identify simulated responses.
- History scrolls independently; the composer stays at the bottom, with bottom safe-area spacing. VisualViewport resize adjusts available height when the keyboard shrinks it. Transcript editing, microphone timer, fallback audio controls, errors and cancellation remain available.
- Review remains accessible as a scrollable overlay with its existing close control.

## Learning interactions

- User messages have collapsed learning capsules attached below their bubble. Assistant replies retain listen, translate and copy.
- At mobile/tablet widths, a selected capsule expands inline. At 1024px and above, the selected card appears in a right-hand learning rail. Exactly one card is mounted. Resizing moves it without making an extra rewrite request.
- A correction capsule shows the actual corrected French directly, highlighting changed words; tapping it reveals explanations and register alternatives. No “A small suggestion” heading is shown. If no corrected text is provided, a correction gets a neutral “View explanation” fallback; an empty correction produces neutral “Expression options”. No positive language judgment is invented from missing feedback. There is no automatic “Excellent!” badge.
- The three tabs are Correct errors / More polite / Slang. They use the existing `/rewrite` API for actual separate rewrites, only after the corresponding tab is chosen. The original/corrected French word diff and notebook saving remain.
- Cached successful rewrite promises are scoped to message, text, interface language and register. Closing/reopening or resizing reuses them. Failed requests can be retried; late results from another tab do not replace the selected tab.
- Tabs support arrow keys, Home/End, focus, selected state and associated tab panels. Capsules expose expanded/control attributes and cards have a labeled collapse button.
- Continuous conversation hides all per-turn learning controls and continues to use the final review.
- Expanding a card does not trigger message auto-scroll. New messages retain existing scrolling behavior; reduced motion disables smooth scrolling and entrances.

## Language and costs

New feedback uses the chosen interface language as before. Opening older feedback in another interface language translates explanatory prose on demand using `/translate`, without replacing stored original text. Legacy source-language inference uses Chinese character presence because stored messages lack a language field; it is a heuristic, not a general language detector. French practice examples remain French. Rewrite explanations are requested in the currently selected language.

Translation/rewrite actions in real mode can incur API charges. Both paths (including their public proxy aliases) now share the existing authenticated provider rate budget. No new routes or providers were introduced. The translation prompt now accepts explanatory prose as well as French replies and asks it to retain embedded French examples.

No real provider calls were made during development. Mock rewrites/translations are explicitly labeled fixtures and do not validate correction, register or speech quality. A correct example is **un café**, not une café.

## Source

- `frontend/components/Studio.tsx`: header/menu, immersive viewport, review and VisualViewport integration.
- `frontend/components/MessageList.tsx`: capsule selection, inline/rail layout and per-message request caches; preserves translation, copy, playback and transcript provenance.
- `frontend/components/CorrectionCard.tsx`: three accessible tabs, word diff, lazy rewrites, explanation localization, retry and notebook saving.
- `frontend/components/Composer.tsx`: removes repeated footer hints; preserves recording, edit and send logic.
- `frontend/app/chat-learning.css`: layout and learning-card styling on existing sage design tokens.
- `frontend/app/layout.tsx`, `frontend/scripts/build-demo.mjs`: include the new styles in production and standalone HTML.
- `frontend/lib/demo.ts`: labeled fixture content for offline previews.
- `backend/app/providers.py`: translation prompt accepts existing explanations; formats newly merged provider code.
- `backend/app/security.py`: rewrite/translation rate budget.
- `frontend/tests/message-actions.test.tsx`: interaction coverage; existing demo/notebook tests updated to explicitly open collapsed cards.
- `backend/tests/test_private_site.py`: shared-budget coverage for direct and proxy learning paths.
- Formatting-only cleanup for newly merged `globals.css` and `backend/tests/test_api.py` to pass required repository checks.

## Verification

```sh
PARLONS_PYTHON=/path/to/python bash scripts/check.sh
```

Passed Ruff/formatting, backend mock tests, fixture evaluation, Prettier, ESLint, TypeScript, frontend tests and production build. Final counts: **172 backend tests, 79 frontend tests**. Existing TestClient deprecation warning remains.

Chromium checked standalone HTML and the production `/demo` route: initial collapse; inline expansion; wide-screen rail; alternative tabs; settings/language access; no horizontal overflow at 320, 390, 768 and 1280px; composer visible at a 500px window height; continuous-mode suppression; reduced motion; no page errors or external calls. Screenshots are actual browser captures. Physical iPhone/Safari keyboard, microphone and blur performance still require testing; a resized desktop window is not a substitute for device testing.

In-memory rewrites/translations are not retained after a reload. No native haptics or new persona portrait are included.

## Try this branch

Download this branch via GitHub Code → Download ZIP. Extract into a new folder, open a terminal there, then run mock mode first:

```sh
python3 scripts/run_local.py --tunnel --port 3200 --api-port 8200
```

Use the newly printed URL and password. No `--real` is needed for UI testing. Your previously running folder / old tunnel URL will continue to show the old app.

`docs/demo/parlons-inline-learning-demo.zip` also contains a standalone HTML preview; extract and open it in a browser. It uses scripted text/tone fixtures and makes no API calls.

Actual screenshots: `docs/design/inline-learning-{collapsed,expanded,chinese,desktop}.png`.

The third tab now teaches argot/verlan rather than repeating natural correction. See [definitions, provenance and checks](FRENCH_SLANG.md).
