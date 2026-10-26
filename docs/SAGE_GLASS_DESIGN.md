# A · Sauge Verre — design preview

This change is isolated on `design/sage-glass`. Do not merge into `main` until the owner has tested and approved it.

## Scope

Recreates direction A from the supplied reference: sage / ivory atmosphere, warm peach user messages, separate translucent assistant cards, capsule controls and a glass composer. Keeps the existing Camille introduction and identity, settings, notebook, transcript review, correction cards, guided/conversation modes, playback, cancellation, summaries and all request handlers. These functional elements were absent from the visual reference; they remain available rather than being removed to match a static mockup.

No backend changes, API/route changes, provider changes or real provider calls. The only new state is dismissal of visual notices. Reduced-motion users also receive immediate rather than smooth message scrolling.

## Files and complete source

- `frontend/app/sage-glass.css`: all theme tokens and styles; loaded after existing styles for easy rollback. Variables at `.parlons-app` control colors, card/pill radii, shadow, glass blur, fonts and animation timing.
- `frontend/app/layout.tsx`: imports the theme.
- `frontend/components/Studio.tsx`: decorative, noninteractive background; speech availability notice using existing backend status.
- `frontend/components/MessageList.tsx`: stable message keys, 50ms entrance staggering (capped at 200ms), reduced-motion scrolling.
- `frontend/components/GlassNotice.tsx`: icon, live status text and accessible dismissal; does not change service readiness.
- `frontend/components/AppChrome.tsx`: dismissible connection notice and icon.
- `frontend/public/fonts/`: local Inter and Fraunces variable WOFF2, Latin/Latin Extended, plus upstream SIL Open Font Licenses. Source: Fontsource 5.3.0 packages. No runtime third-party font requests or new npm dependency.
- `frontend/scripts/build-demo.mjs`: includes theme and embeds fonts for the standalone offline demo.
- `frontend/tests/glass-notice.test.tsx`: notice dismissal leaves the text interface usable.
- `docs/design/sage-glass-*.png`: actual browser screenshots, not generated mockups.

## Details

Three 80px-blurred background circles drift over a 20-second transform-only loop, with 3.5% SVG noise. Glass uses 24px standard/WebKit backdrop blur and white borders. Cards use 28px radii, controls 999px; shadows use `0 12px 40px rgba(0,0,0,.08)`.

Animations use only transform/opacity: 100ms pressed scale, 280ms release, 300ms message entrance, soft microphone ring. Reduced motion disables all of these and smooth scrolling. Color changes are immediate while opacity transitions communicate enabled/disabled state. Touch targets are at least 44px; all existing real buttons and accessible names are preserved. Composer includes bottom safe-area padding and stays sticky within the chat section. Enabled body text uses dark green, not pale sage. Placeholder is dark as well.

Normal browser/Safari vibration is not a reliable iOS haptic interface. No native wrapper exists, so no unsupported native API or unrelated dependency was introduced. Physical iPhone/Safari testing is still needed for keyboard, blur performance, microphone and autoplay behavior.

## Preview without spending API credits

Download this branch via GitHub Code → Download ZIP and extract into a NEW folder (do not overwrite the working main copy). In that folder:

```sh
python3 scripts/run_local.py --tunnel --port 3200 --api-port 8200
```

No `--real`: keep `MOCK_AI=true`. Open the newly printed HTTPS URL and use the newly printed site password. Old tunnel URLs still show old running processes, not the new folder.

For a completely offline text demo, after building the frontend open `frontend/public/parlons-demo.html`. It includes fonts and styles; replies and audio are demonstrations, not real AI quality evidence.

## Verification

```sh
PARLONS_PYTHON=/path/to/venv/bin/python bash scripts/check.sh
```

Verified in mock mode: Ruff, Python formatting, 154 backend tests, fixture evaluation, Prettier, ESLint, TypeScript, 69 frontend tests, production Next build.

Chromium checked both standalone HTML and production `/demo`: send/disabled controls, French content and English interface, no horizontal overflow at 320/390/768/1280px, reduced-motion backgrounds/message entrances and zero page errors. Screenshots use scripted demo content. This does not validate real STT, tutoring, TTS quality or physical iOS behavior. Existing backend TestClient deprecation warning remains.
