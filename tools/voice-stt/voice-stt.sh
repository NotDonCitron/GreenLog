#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PY="$ROOT_DIR/.venv/bin/python"
DURATION="${1:-8}"
MODEL="${WHISPER_MODEL:-small}"
LANGUAGE="${WHISPER_LANG:-de}"
BEAM_SIZE="${WHISPER_BEAM_SIZE:-1}"
BACKEND="${AUDIO_BACKEND:-arecord}" # arecord | ffmpeg
PTT_MODE="${PTT_MODE:-0}" # 1 = start/stop by Enter
TMP_DIR="$ROOT_DIR/.tmp"
AUDIO_FILE="$TMP_DIR/input_$(date +%s).wav"

if [ ! -x "$VENV_PY" ]; then
  echo "Fehler: venv fehlt. Starte zuerst: ./tools/voice-stt/setup.sh"
  exit 1
fi

mkdir -p "$TMP_DIR"

record_with_arecord_fixed() {
  set +e
  arecord -q -f S16_LE -r 16000 -c 1 -d "$DURATION" "$AUDIO_FILE"
  status=$?
  set -e
  if [ $status -ne 0 ]; then
    echo "Aufnahme mit arecord fehlgeschlagen."
    echo "Tipp: versuche AUDIO_BACKEND=ffmpeg ./tools/voice-stt/voice-stt.sh ${DURATION}"
    exit $status
  fi
}

record_with_arecord_ptt() {
  echo "PTT: Enter = Start, Enter = Stop"
  read -r
  echo "Aufnahme läuft... (Enter zum Stoppen)"
  arecord -q -f S16_LE -r 16000 -c 1 "$AUDIO_FILE" &
  REC_PID=$!
  read -r
  kill -INT "$REC_PID" >/dev/null 2>&1 || true
  wait "$REC_PID" 2>/dev/null || true
}

record_with_ffmpeg_fixed() {
  ffmpeg -hide_banner -loglevel error -f pulse -i default -t "$DURATION" -ac 1 -ar 16000 "$AUDIO_FILE"
}

record_with_ffmpeg_ptt() {
  echo "PTT: Enter = Start, Enter = Stop"
  read -r
  echo "Aufnahme läuft... (Enter zum Stoppen)"
  ffmpeg -hide_banner -loglevel error -f pulse -i default -ac 1 -ar 16000 "$AUDIO_FILE" &
  REC_PID=$!
  read -r
  kill -INT "$REC_PID" >/dev/null 2>&1 || true
  wait "$REC_PID" 2>/dev/null || true
}

if [ "$BACKEND" = "arecord" ]; then
  if ! command -v arecord >/dev/null 2>&1; then
    echo "Fehler: arecord nicht gefunden."
    exit 1
  fi
  if [ "$PTT_MODE" = "1" ]; then
    record_with_arecord_ptt
  else
    echo "Aufnahme startet (Dauer: ${DURATION}s, Backend: ${BACKEND})..."
    record_with_arecord_fixed
  fi
elif [ "$BACKEND" = "ffmpeg" ]; then
  if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "Fehler: ffmpeg nicht gefunden."
    exit 1
  fi
  if [ "$PTT_MODE" = "1" ]; then
    record_with_ffmpeg_ptt
  else
    echo "Aufnahme startet (Dauer: ${DURATION}s, Backend: ${BACKEND})..."
    record_with_ffmpeg_fixed
  fi
else
  echo "Fehler: unbekanntes AUDIO_BACKEND '$BACKEND' (erlaubt: arecord, ffmpeg)"
  exit 1
fi

echo "Transkribiere..."
"$VENV_PY" "$ROOT_DIR/transcribe.py" \
  --audio "$AUDIO_FILE" \
  --model "$MODEL" \
  --language "$LANGUAGE" \
  --beam-size "$BEAM_SIZE"

rm -f "$AUDIO_FILE"
