# Slang / argot / verlan learning tab

Update: the fixed mini glossary was removed from the UI in the [feedback/lookup update](FEEDBACK_AND_LOOKUP.md). The definitions below document the provider guidance and earlier verification, not a current glossary feature.

The **俚语 / Slang** exploration choice sits below the primary correction in direction A, alongside More polite. It remains opt-in, with the existing on-demand `/rewrite` route and shared call budget. It rewrites the complete original learner message, corrects grammar where necessary and preserves correct clauses; it does not use the possibly partial correction field as the source.

## Definitions used

- **Argot**: vocabulary associated with informal speech or particular social groups. Not all relaxed/shortened French is argot.
- **Verlan**: a word-formation process involving reversed syllables, frequently with phonological changes. It is not reversing all letters and not French sentence inversion.
- **Familier**: an informal register. Using tu, dropping ne, or shortening a coffee order does not by itself make a sentence slang or verlan.

These are established linguistic distinctions. Youth vocabulary varies by age, region, social group and context; no claim is made about all French young adults or a 2026 popularity ranking.

| Item | Standard form / meaning | Category and use |
|---|---|---|
| ouf | fou; figuratively crazy/amazing | Verlan; may intensify meaning, as in un truc de ouf. Do not exaggerate mild statements. |
| chelou | louche; shady, suspicious or unsettling | Verlan; can sound judgmental. Not a universal replacement for unusual. |
| relou | lourd in the sense of annoying/tiresome | Verlan; not a description of physical weight. |
| teuf | fête; an informal party | Verlan; not every celebration necessarily calls for this word. |
| kiffer | aimer / apprécier; like/enjoy | Familiar slang, not verlan. |
| taf | travail; work/job | Slang, not verlan. |
| fringues | vêtements; clothes | Slang, not verlan. |

Contextual examples, not automatic replacements:

- J’aime cette musique. → Je kiffe cette musique.
- Je vais au travail. → Je vais au taf.
- On va faire la fête. → On va faire la teuf.
- C’est suspect. → C’est chelou. (Informal and potentially judgmental.)

A coffee order need not have a slang counterpart. The model is instructed to keep a faithful corrected sentence and explain the lack of a suitable slang substitution. It must not invent slang, add feelings or relationships, increase intensity, use slurs/vulgarity, or mislabel ordinary familiar speech as slang.

## Research provenance and limitation — 2026-10-26

Requested web research was attempted against Le Robert, Larousse, CNRTL, Wiktionary and search engines. The execution environment returned HTTP 403, including a second direct attempt to access Le Robert. **No page content was retrieved.** The definitions/examples above therefore draw on established language knowledge, not freshly verified web sources or evidence of current youth usage.

Reference entry points for later human verification (not accessed sources):

- [Le Robert: verlan](https://dictionnaire.lerobert.com/definition/verlan)
- [Le Robert: chelou](https://dictionnaire.lerobert.com/definition/chelou)
- [Le Robert: kiffer](https://dictionnaire.lerobert.com/definition/kiffer)
- [Le Robert: taf](https://dictionnaire.lerobert.com/definition/taf)
- [Wiktionary: verlan](https://fr.wiktionary.org/wiki/verlan)

These URLs are provided as verification starting points, not quotations or a claim that their current contents have been read.

## Implementation

- `backend/app/slang.py`: semantic guardrails, category distinctions and clearly labeled mock fixtures.
- `backend/app/providers.py`: attaches this guidance to the slang request, keeps learner input in its user-data message, validates the returned expression/explanation, and exercises the same SDK/request/schema path in mock mode.
- `backend/app/main.py`: accepts `slang`; retains `local` as a compatibility alias for older clients, now using the slang guidance.
- `frontend/components/CorrectionCard.tsx`: Slang exploration choice; uses the complete original input, keeps explanation language and request caching.
- The former `frontend/components/SlangGuide.tsx` was removed; contextual slang rewriting remains.
- `frontend/lib/demo.ts`: explicit fixture Je kiffe cette musique; otherwise honest no-slang fallback. The offline demo does not have an actual language model.

Explanations are requested in the current Chinese/English interface language. They must describe the actual term, its standard meaning, category and appropriate social setting. Production linguistic quality is still dependent on the model and has not been validated in this task.

## Verification

All development used `MOCK_AI=true`, with external provider sockets blocked in backend tests. **172 backend tests and 79 frontend tests passed**, plus Ruff/formatting, Prettier, ESLint, TypeScript and production build.

New checks cover slang and legacy style acceptance, non-verlan kiffer labeling, preserving a coffee sentence without invented slang, unchanged conversation history, real request structure via mocked transport, timeout and malformed response fallback, and the frontend sending the complete learner message only when the slang button is selected.

A Chromium offline browser check verified Chinese Slang tab, kiffer fixture, expandable verlan glossary, corrected-coffee fallback, mobile/wide-screen layout, zero external requests and zero page errors. Screenshots: `docs/design/slang-learning-{mobile,guide,desktop}.png`.

No real OpenAI or ElevenLabs calls, speech recognition evaluation, current-popularity study or deployment was performed. This branch is not merged to main.
