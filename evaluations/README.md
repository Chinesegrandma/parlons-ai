# French evaluation fixtures

`french_cases.json` has exactly 20 hand-authored examples: 3 grammar, 3 conjugation,
4 gender-agreement, 6 correct sentences, and 4 pronunciation challenge prompts.
The correct sentences must not trigger a correction. Cases specify context where
needed (for example an all-female group using “allées”). This is a starter set,
not an independently reviewed or representative proficiency benchmark.

## Offline scoring (no provider calls)

From the repository root:

```bash
MOCK_AI=true python3 evaluations/evaluate.py
MOCK_AI=true python3 evaluations/evaluate.py \
  --predictions evaluations/fixtures/mock_predictions.json \
  --output /tmp/parlons-mock-evaluation.json
```

No predictions means **unrun**, with null metrics and full missing coverage.
The included predictions are deliberately imperfect **hand-scripted fixtures**.
They are not outputs from OpenAI, ElevenLabs, or any recognition model. Their
scores only test scorer arithmetic and must not be cited as model accuracy.

Prediction file format:

```json
{
  "source": "mock_fixture",
  "predictions": [
    {
      "id": "fr-01",
      "correction": "Use the contraction au.",
      "corrected_text": "Je vais au marché."
    },
    {
      "id": "fr-17",
      "correction": "",
      "transcript": "Tu as tout lu ?",
      "audio_sha256": "copy the SHA-256 from this case's audio metadata"
    }
  ]
}
```

Use `source: real_provider` only for actual provider outputs after approval, or
`human` for manually produced outputs. The evaluator never generates predictions.
Use the application's returned correction string verbatim. `corrected_text` is
optional and requires separate extraction or human annotation because the chat
API returns an explanation rather than a dedicated corrected-sentence field.

Metrics:

- **Correction precision** = TP / (TP + FP): detecting whether a correction was needed.
- **Correction recall** = TP / (TP + FN).
- **False-positive correction rate** = FP / (FP + TN), among correct sentences.
- **Exact correction match rate**: supplementary matching against accepted sentences
  when a `corrected_text` is supplied. Valid alternative wordings may be rejected.
- **Micro word error rate** = total token edit distance / total reference words.
  Case and punctuation are ignored, accents retained, and apostrophes/hyphens split
  consistently. WER may exceed 1 when there are many insertions.

A nonempty correction is a predicted positive. Detection metrics do not establish
that the correction itself or the Chinese explanation is right. Missing predictions
are reported separately and excluded; coverage must accompany any score. A zero
denominator yields null, never an invented perfect score.

## Audio provenance and limits

The four committed WAV files were generated **offline**, with eSpeak NG through
`espeakng-loader==0.2.4`, voice `fr`, default speed. Their generation texts are the
reference transcripts; SHA-256 digests identify the audio. They cover prompts for
/y/ vs /u/, nasal vowels, liaison, and French rhotics. The files contain synthetic
speech, not recordings of learners making those mistakes, and are not a listening
or pronunciation-quality benchmark.

The mock hypotheses contain a deliberate word substitution to exercise WER. They
were not transcribed from the audio by a recognizer. The scorer requires an existing
labeled audio file, reference transcript, and matching audio fingerprint before
counting a speech hypothesis. Text-only examples cannot produce a WER score.
There is no pronunciation-scoring metric in this project.

To regenerate the audio locally (optional):

```bash
python3 -m pip install -r evaluations/requirements-fixtures.txt
MOCK_AI=true python3 evaluations/generate_audio_fixtures.py
```

Regeneration can change audio digests; update any matching prediction fingerprints
before scoring. No paid API is involved. Before claiming production quality, collect
consented learner recordings with independently checked verbatim transcripts and
human-reviewed correction labels, including different accents and recording conditions.
