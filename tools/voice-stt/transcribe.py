#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
from pathlib import Path

from faster_whisper import WhisperModel


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Local speech-to-text with faster-whisper")
    parser.add_argument("--audio", required=True, help="Path to WAV file")
    parser.add_argument("--model", default="small", help="Whisper model size")
    parser.add_argument("--language", default="de", help="Language code, e.g. de or en")
    parser.add_argument("--device", default=os.getenv("WHISPER_DEVICE", "cpu"), help="cpu or cuda")
    parser.add_argument(
        "--compute-type",
        default=os.getenv("WHISPER_COMPUTE_TYPE", "int8"),
        help="int8, int8_float16, float16, float32",
    )
    parser.add_argument(
        "--beam-size",
        type=int,
        default=int(os.getenv("WHISPER_BEAM_SIZE", "1")),
        help="Lower is faster (1 = fastest)",
    )
    parser.add_argument(
        "--vad-filter",
        action="store_true",
        default=os.getenv("WHISPER_VAD", "1") == "1",
        help="Enable VAD filter (can improve quality in noisy input)",
    )
    parser.add_argument(
        "--no-vad-filter",
        action="store_false",
        dest="vad_filter",
        help="Disable VAD filter for slightly faster transcription",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    audio_path = Path(args.audio)

    if not audio_path.exists():
        raise SystemExit(f"Audio file not found: {audio_path}")

    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)
    segments, _ = model.transcribe(
        str(audio_path),
        language=args.language,
        beam_size=max(1, args.beam_size),
        best_of=1,
        temperature=0.0,
        vad_filter=args.vad_filter,
    )

    text = " ".join(segment.text.strip() for segment in segments).strip()
    if text:
        print(text)
    else:
        print("(kein Text erkannt)")


if __name__ == "__main__":
    main()
