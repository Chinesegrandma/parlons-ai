# Minimal Parlons interface

The existing Next.js/FastAPI app now opens on a warm-white landing page with a
single blue speaking action. The practice screen emphasizes the latest reply,
with corrections, inspiration, and transcript history available on demand.
All eight scenarios, editable original transcripts, autoplay, slow playback,
and text-only fallback are retained. Session summaries show actual user turns,
not inferred proficiency scores. The new learning release adds configurable explanation language, scene goals,
and a browser-local memory notebook. See [Mobile learning](../MOBILE_LEARNING.md).

## Actual browser captures

These PNGs capture the real React app's generated standalone demo at desktop
(1440 × 1000) and mobile (390 × 844) viewport sizes. Demo replies, corrections,
and audio are scripted. No paid providers or real microphone were used.

- [Homepage](home-desktop.png)
- [Practice](practice-desktop.png)
- [Expanded feedback](feedback-desktop.png)
- [Session summary](summary-desktop.png)
- [Mobile homepage](home-mobile.png)
- [Mobile practice](practice-mobile.png)

To try the same UI, run `npm ci && npm run dev` from `frontend` and open `/demo`,
or download the [standalone demo](../demo/parlons-interactive-demo.zip).
The `/` route continues to use the existing backend API.

Validation: 51 frontend tests, TypeScript, ESLint, production build, and Chromium
interaction checks (start, send, feedback, finish, resume, and mobile layout).
Browser checks found no page errors or horizontal overflow at mobile width.
