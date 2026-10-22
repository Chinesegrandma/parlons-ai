import hashlib
import importlib.util
import json
import wave
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("evaluation", ROOT / "evaluations/evaluate.py")
evaluation = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(evaluation)
DATASET = ROOT / "evaluations/french_cases.json"


def test_dataset_has_20_examples_and_labeled_audio():
    cases = json.loads(DATASET.read_text())["examples"]
    assert len(cases) == 20
    assert {case["category"] for case in cases} == {
        "grammar",
        "conjugation",
        "gender_agreement",
        "correct",
        "pronunciation",
    }
    assert sum(case["should_correct"] for case in cases) == 10
    for case in cases:
        if case["audio"]:
            audio = case["audio"]
            path = DATASET.parent / audio["path"]
            assert hashlib.sha256(path.read_bytes()).hexdigest() == audio["sha256"]
            assert audio["kind"] == "synthetic_espeak_ng"
            assert audio["reference_transcript"] == case["input"]
            with wave.open(str(path)) as file:
                assert file.getnframes() > 0
                assert file.getnchannels() == 1


def test_scripted_fixture_metrics():
    predictions = json.loads((ROOT / "evaluations/fixtures/mock_predictions.json").read_text())
    report = evaluation.evaluate(DATASET, predictions)
    assert report["prediction_source"] == "mock_fixture"
    assert report["evaluated_examples"] == 20
    assert report["confusion_matrix"] == {"tp": 4, "fp": 1, "fn": 6, "tn": 9}
    assert report["correction_precision"] == 0.8
    assert report["correction_recall"] == 0.4
    assert report["false_positive_correction_rate"] == 0.1
    assert report["speech"]["evaluated_audio_examples"] == 4
    assert report["speech"]["word_errors"] == 1
    assert report["speech"]["word_error_rate"] == pytest.approx(1 / 19)


def test_no_predictions_are_unrun_not_perfect_scores():
    report = evaluation.evaluate(DATASET, {"source": "not_run", "predictions": []})
    assert report["evaluated_examples"] == 0
    assert len(report["missing_prediction_ids"]) == 20
    assert report["correction_precision"] is None
    assert report["correction_recall"] is None
    assert report["false_positive_correction_rate"] is None
    assert report["speech"]["word_error_rate"] is None


@pytest.mark.parametrize(
    "reference,hypothesis,distance",
    [
        ("je vais au café", "je va au café", 1),
        ("bonjour", "", 1),
        ("", "bonjour", 1),
        ("un bon vin", "un très bon vin", 1),
        ("L’heure est arrivée.", "l'heure est arrivée", 0),
    ],
)
def test_word_edit_distance(reference, hypothesis, distance):
    assert (
        evaluation.edit_distance(evaluation.words(reference), evaluation.words(hypothesis))
        == distance
    )


def test_text_only_case_cannot_be_scored_as_speech():
    with pytest.raises(ValueError, match="labeled audio"):
        evaluation.evaluate(
            DATASET,
            {
                "source": "mock_fixture",
                "predictions": [
                    {"id": "fr-01", "correction": "", "transcript": "Je vais au marché"}
                ],
            },
        )


def test_missing_audio_identity_rejected():
    with pytest.raises(ValueError, match="digest mismatch"):
        evaluation.evaluate(
            DATASET,
            {
                "source": "mock_fixture",
                "predictions": [{"id": "fr-17", "correction": "", "transcript": "Tu as tout lu ?"}],
            },
        )


@pytest.mark.parametrize(
    "rows",
    [
        [{"id": "unknown", "correction": ""}],
        [{"id": "fr-01", "correction": ""}] * 2,
        [{"id": "fr-01", "correction": None}],
    ],
)
def test_invalid_predictions_rejected(rows):
    with pytest.raises(ValueError):
        evaluation.evaluate(DATASET, {"source": "mock_fixture", "predictions": rows})
