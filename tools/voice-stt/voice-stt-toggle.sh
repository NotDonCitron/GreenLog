#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PY="$ROOT_DIR/.venv/bin/python"
TMP_DIR="$ROOT_DIR/.tmp"
STATE_FILE="$TMP_DIR/ptt-state.env"
REC_FILE="$TMP_DIR/ptt-input.wav"
LOCK_FILE="$TMP_DIR/ptt.lock"
OUTPUT_FILE="$TMP_DIR/last-transcript.txt"

MODEL="${WHISPER_MODEL:-tiny}"
LANGUAGE="${WHISPER_LANG:-de}"
BEAM_SIZE="${WHISPER_BEAM_SIZE:-1}"
BACKEND="${AUDIO_BACKEND:-arecord}" # arecord | ffmpeg

mkdir -p "$TMP_DIR"

if [ ! -x "$VENV_PY" ]; then
  echo "Fehler: venv fehlt. Starte zuerst: ./tools/voice-stt/setup.sh"
  exit 1
fi

notify() {
  local msg="$1"
  if command -v notify-send >/dev/null 2>&1; then
    notify-send "Voice STT" "$msg" || true
  fi
  echo "$msg"
}

is_running() {
  if [ ! -f "$STATE_FILE" ]; then
    return 1
  fi
  # shellcheck disable=SC1090
  source "$STATE_FILE"
  [ -n "${REC_PID:-}" ] && kill -0 "$REC_PID" 2>/dev/null
}

start_recording() {
  if [ "$BACKEND" = "arecord" ]; then
    if ! command -v arecord >/dev/null 2>&1; then
      notify "Fehler: arecord nicht gefunden."
      exit 1
    fi
    arecord -q -f S16_LE -r 16000 -c 1 "$REC_FILE" &
  elif [ "$BACKEND" = "ffmpeg" ]; then
    if ! command -v ffmpeg >/dev/null 2>&1; then
      notify "Fehler: ffmpeg nicht gefunden."
      exit 1
    fi
    ffmpeg -hide_banner -loglevel error -f pulse -i default -ac 1 -ar 16000 "$REC_FILE" &
  else
    notify "Fehler: unbekanntes AUDIO_BACKEND '$BACKEND' (arecord|ffmpeg)"
    exit 1
  fi

  local rec_pid=$!
  cat > "$STATE_FILE" <<EOF
REC_PID=$rec_pid
BACKEND=$BACKEND
STARTED_AT=$(date +%s)
EOF
  notify "Aufnahme gestartet (${BACKEND}). Hotkey erneut drücken zum Stoppen."
}

stop_and_transcribe() {
  # shellcheck disable=SC1090
  source "$STATE_FILE"
  kill -INT "$REC_PID" >/dev/null 2>&1 || true
  wait "$REC_PID" 2>/dev/null || true
  rm -f "$STATE_FILE"

  if [ ! -s "$REC_FILE" ]; then
    notify "Keine Audio-Daten erkannt."
    rm -f "$REC_FILE"
    exit 1
  fi

  notify "Transkribiere..."
  local text
  text="$("$VENV_PY" "$ROOT_DIR/transcribe.py" \
    --audio "$REC_FILE" \
    --model "$MODEL" \
    --language "$LANGUAGE" \
    --beam-size "$BEAM_SIZE")"

  rm -f "$REC_FILE"
  printf "%s\n" "$text" | tee "$OUTPUT_FILE"

  if command -v wl-copy >/dev/null 2>&1; then
    printf "%s" "$text" | wl-copy || true
    notify "Fertig. Text in Zwischenablage kopiert."
  else
    notify "Fertig."
  fi
}

# Simple lock to avoid race conditions on fast double invoke.
if ! mkdir "$LOCK_FILE" 2>/dev/null; then
  exit 0
fi
trap 'rmdir "$LOCK_FILE" 2>/dev/null || true' EXIT

if is_running; then
  stop_and_transcribe
else
  start_recording
fi

