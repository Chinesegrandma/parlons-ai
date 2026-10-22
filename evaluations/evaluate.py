"""Offline scoring only. This module has no network clients or API calls."""

import argparse
import hashlib
import json
import unicodedata
from pathlib import Path


def words(text: str) -> list[str]:
    text = unicodedata.normalize("NFC", text).casefold()
    # Keep accents; split apostrophes, hyphens and other punctuation consistently.
    return "".join(char if char.isalnum() else " " for char in text).split()


def edit_distance(reference: list[str], hypothesis: list[str]) -> int:
    previous = list(range(len(hypothesis) + 1))
    for i, expected in enumerate(reference, 1):
        current = [i]
        for j, actual in enumerate(hypothesis, 1):
            current.append(
                min(
                    current[-1] + 1,
                    previous[j] + 1,
                    previous[j - 1] + (expected != actual),
                )
            )
        previous = current
    return previous[-1]


def ratio(numerator: int, denominator: int) -> float | None:
    return numerator / denominator if denominator else None


def evaluate(dataset_path: Path, predictions: dict) -> dict:
    dataset = json.loads(dataset_path.read_text())
    examples = {case["id"]: case for case in dataset["examples"]}
    if len(examples) != len(dataset["examples"]):
        raise ValueError("Duplicate dataset IDs")
    source = predictions.get("source", "not_run")
    if source not in {"not_run", "mock_fixture", "real_provider", "human"}:
        raise ValueError("Label source as mock_fixture, real_provider or human")
    rows = predictions.get("predictions", [])
    if rows and source == "not_run":
        raise ValueError("Predictions must declare their source")
    seen = set()
    tp = fp = fn = tn = exact = exact_total = 0
    speech_edits = speech_words = speech_count = 0
    speech_kinds: set[str] = set()
    for row in rows:
        key = row["id"]
        if key not in examples or key in seen:
            raise ValueError(f"Unknown or duplicate prediction ID: {key}")
        seen.add(key)
        case = examples[key]
        correction = row.get("correction")
        if not isinstance(correction, str):
            raise ValueError(f"Prediction {key} needs a string correction (empty means none)")
        predicted = bool(correction.strip())
        expected = case["should_correct"]
        tp += predicted and expected
        fp += predicted and not expected
        fn += not predicted and expected
        tn += not predicted and not expected
        if expected and "corrected_text" in row:
            if not isinstance(row["corrected_text"], str):
                raise ValueError("corrected_text must be a string")
            exact_total += 1
            exact += words(row["corrected_text"]) in [
                words(text) for text in case["accepted_corrections"]
            ]
        if "transcript" in row:
            audio = case.get("audio")
            if not audio or not audio.get("reference_transcript"):
                raise ValueError(f"{key}: WER requires labeled audio and a reference transcript")
            if not isinstance(row["transcript"], str):
                raise ValueError("transcript must be a string")
            path = (dataset_path.parent / audio["path"]).resolve()
            if not path.is_relative_to(dataset_path.parent.resolve()) or not path.is_file():
                raise ValueError("Audio fixture missing or outside dataset directory")
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest != audio.get("sha256") or digest != row.get("audio_sha256"):
                raise ValueError("Audio digest mismatch; hypothesis must identify its audio")
            reference = words(audio["reference_transcript"])
            speech_edits += edit_distance(reference, words(row["transcript"]))
            speech_words += len(reference)
            speech_count += 1
            speech_kinds.add(audio["kind"])
    return {
        "prediction_source": source,
        "dataset_examples": len(examples),
        "evaluated_examples": len(seen),
        "missing_prediction_ids": sorted(examples.keys() - seen),
        "correction_precision": ratio(tp, tp + fp),
        "correction_recall": ratio(tp, tp + fn),
        "false_positive_correction_rate": ratio(fp, fp + tn),
        "confusion_matrix": {"tp": tp, "fp": fp, "fn": fn, "tn": tn},
        "exact_correction_match_rate": ratio(exact, exact_total),
        "exact_correction_examples": exact_total,
        "speech": {
            "evaluated_audio_examples": speech_count,
            "fixture_kinds": sorted(speech_kinds),
            "word_errors": speech_edits,
            "reference_words": speech_words,
            "word_error_rate": ratio(speech_edits, speech_words),
        },
        "limitations": [
            "Correction metrics measure detection, not correctness of Chinese explanations.",
            "Exact correction matching is supplementary and may reject valid alternatives.",
            "Missing predictions are unrun, not successful or negative predictions.",
            "Synthetic audio and scripted mock hypotheses do not validate real ASR quality.",
            "Text cases do not measure pronunciation or speech recognition accuracy.",
            "This small hand-authored dataset is not a production quality benchmark.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dataset", type=Path, default=Path(__file__).with_name("french_cases.json")
    )
    parser.add_argument("--predictions", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    predictions = (
        json.loads(args.predictions.read_text())
        if args.predictions
        else {"source": "not_run", "predictions": []}
    )
    try:
        report = evaluate(args.dataset, predictions)
    except (ValueError, KeyError, OSError) as error:
        parser.error(str(error))
    output = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.write_text(output)
    print(output, end="")


if __name__ == "__main__":
    main()
