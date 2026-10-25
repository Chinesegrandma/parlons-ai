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

Validation: 54 frontend tests, TypeScript, ESLint, production build, and Chromium
interaction checks (start, send, feedback, finish, resume, and mobile layout).
Browser checks found no page errors or horizontal overflow at mobile width.

## Focused mobile refinement

- Chinese interface with French reserved for learning content; two navigation destinations.
- Fixed 86px microphone, optional keyboard input, and collapsed practice tools.
- Corrections compare original and suggested text and highlight only changed tokens. An explicit
  save action confirms the correction in the notebook.
- Settings occupy their own view. Level and explanation language use segmented buttons;
  other preferences and playback controls are progressively disclosed.
- Custom situations lead the scene browser; preset lists expand on demand. Empty notebooks
  omit review and filter controls. Obsolete green-sidebar styles have been removed.
- Checked text/background contrast: secondary text 5.97:1, blue on paper 7.02:1,
  blue on pale blue 6.34:1, white on blue 7.40:1. This is not a full accessibility audit.

Latest actual demo captures:

- [Mobile practice](refined-practice-mobile.png)
- [Mobile correction](refined-correction-mobile.png)
- [Mobile scenes](refined-scenes-mobile.png)
- [Mobile notebook](refined-notebook-mobile.png)
- [Mobile settings](refined-settings-mobile.png)
- [Desktop correction](refined-correction-desktop.png)
