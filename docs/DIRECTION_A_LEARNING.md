# Direction A: primary correction + optional expression exploration

Implemented on `dev`, not merged into main.

The message capsule still shows the corrected French directly. Opening it now shows one primary correction block rather than three peer tabs:

1. Corrected expression with changed words highlighted.
2. Explanation in the interface language, with existing localization/retry behavior.
3. Optional original-sentence disclosure and notebook saving.
4. A divider and secondary “Explore another expression” area with More polite / Slang buttons.

Each secondary button is a native disclosure button with expanded/control semantics. Clicking it shows its alternative below the buttons; clicking it again closes it. Switching choices replaces only the optional alternative. The primary corrected sentence and explanation remain visible, including during loading and errors. There is no tablist or artificial tab keyboard behavior; native keyboard activation and focus apply.

Existing on-demand generation, corrected-input slang behavior, cached requests, language separation, late-response protection, glossary and retry remain. The mobile inline / desktop rail layout and one-open-card rule remain. Original utterances are preserved, never overwritten. Continuous conversation still defers learning feedback to its final review.

Files: `frontend/components/CorrectionCard.tsx`, `frontend/app/chat-learning.css`, related component/interaction tests. No backend, routes or provider changes.

Validation in mock mode: **172 backend tests, 79 frontend tests**, Ruff/formatting, Prettier, ESLint, TypeScript and production build passed. Chromium checked no peer tabs, persistent primary feedback across choices, toggling/reopening, one optional alternative, mobile/desktop rail, and no overflow at 320/390/768/1280px, with no page errors or external requests. Physical iOS and real language/speech quality were not evaluated.

Actual screenshots: `docs/design/direction-a-mobile.png`, `direction-a-expanded.png`, `direction-a-desktop.png`. The older 2×2 options image is a concept comparison, not an application screenshot.

The standalone preview ZIP is updated at `docs/demo/parlons-inline-learning-demo.zip`. Extract and open the HTML; its content is scripted and its audio is a tone. To test the full app without provider charges, run from this branch's extracted project directory:

```sh
python3 scripts/run_local.py --tunnel --port 3200 --api-port 8200
```

Open the newly printed URL. No real provider calls or deployment were performed.
