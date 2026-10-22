"""Regenerate synthetic French speech offline with espeakng-loader==0.2.4.

Optional fixture-authoring tool, not an application dependency. These voices are
synthetic test material, NOT learner recordings or a pronunciation benchmark.
"""

import ctypes
import hashlib
import json
import wave
from pathlib import Path


def main():
    import espeakng_loader

    root = Path(__file__).parent
    dataset = json.loads((root / "french_cases.json").read_text())
    lib = espeakng_loader.load_library()
    if lib is None:
        raise RuntimeError("Unable to load eSpeak NG")
    lib.espeak_Initialize.argtypes = [
        ctypes.c_int,
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_int,
    ]
    # AUDIO_OUTPUT_SYNCHRONOUS: callback receives samples without opening an audio device.
    sample_rate = lib.espeak_Initialize(2, 0, espeakng_loader.get_data_path().encode(), 0)
    if sample_rate <= 0:
        raise RuntimeError("Unable to initialize eSpeak NG")
    lib.espeak_SetVoiceByName.argtypes = [ctypes.c_char_p]
    if lib.espeak_SetVoiceByName(b"fr") != 0:
        raise RuntimeError("French voice unavailable")
    lib.espeak_Synth.argtypes = [
        ctypes.c_char_p,
        ctypes.c_size_t,
        ctypes.c_uint,
        ctypes.c_int,
        ctypes.c_uint,
        ctypes.c_uint,
        ctypes.c_void_p,
        ctypes.c_void_p,
    ]
    callback_type = ctypes.CFUNCTYPE(
        ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.c_void_p
    )
    samples = bytearray()

    @callback_type
    def collect(buffer, count, _events):
        if buffer and count:
            samples.extend(ctypes.string_at(buffer, count * 2))
        return 0

    lib.espeak_SetSynthCallback(collect)
    for case in dataset["examples"]:
        audio = case.get("audio")
        if not audio:
            continue
        samples.clear()
        text = audio["reference_transcript"].encode("utf-8")
        if lib.espeak_Synth(text, len(text) + 1, 0, 1, 0, 1, None, None) != 0:
            raise RuntimeError("Speech synthesis failed")
        path = root / audio["path"]
        path.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(path), "wb") as file:
            file.setnchannels(1)
            file.setsampwidth(2)
            file.setframerate(sample_rate)
            file.writeframes(samples)
        audio["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
    lib.espeak_Terminate()
    (root / "french_cases.json").write_text(
        json.dumps(dataset, ensure_ascii=False, indent=2) + "\n"
    )


if __name__ == "__main__":
    main()
