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
BACKEND="${AUDIO_BACKEND:-ffmpeg}" # arecord | ffmpeg | dummy

mkdir -p "$TMP_DIR"

if [ ! -x "$VENV_PY" ]; then
  echo "Fehler: venv fehlt. Starte zuerst: ./tools/voice-stt/setup.sh"
  exit 1
fi

notify() {
  local msg="$1"
  local sound="${2:-}"
  if command -v notify-send >/dev/null 2>&1; then
    notify-send "Voice STT" "$msg" || true
  fi
  if [ "$sound" = "start" ]; then
    paplay /usr/share/sounds/freedesktop/stereo/audio-volume-change.oga 2>/dev/null || true
  elif [ "$sound" = "stop" ]; then
    paplay /usr/share/sounds/freedesktop/stereo/message-new-instant.oga 2>/dev/null || true
  fi
  echo "$msg"
}

is_running() {
  if [ ! -f "$STATE_FILE" ]; then
    return 1
  fi
  local rec_pid
  rec_pid="$(sed -n 's/^REC_PID=//p' "$STATE_FILE" | head -n1)"
  if [ -z "$rec_pid" ] || ! kill -0 "$rec_pid" 2>/dev/null; then
    rm -f "$STATE_FILE"
    return 1
  fi
  return 0
}

start_recording() {
  local rec_pid
  local active_backend="$BACKEND"

  if [ "$BACKEND" = "arecord" ]; then
    if ! command -v arecord >/dev/null 2>&1; then
      notify "Fehler: arecord nicht gefunden."
      exit 1
    fi
    arecord -q -f S16_LE -r 16000 -c 1 "$REC_FILE" &
    rec_pid=$!
  elif [ "$BACKEND" = "ffmpeg" ]; then
    if ! command -v ffmpeg >/dev/null 2>&1; then
      notify "Fehler: ffmpeg nicht gefunden."
      exit 1
    fi
    ffmpeg -y -hide_banner -loglevel error -f pulse -i default -ac 1 -ar 16000 "$REC_FILE" &
    rec_pid=$!
    sleep 0.25
    if ! kill -0 "$rec_pid" 2>/dev/null; then
      if command -v arecord >/dev/null 2>&1; then
        arecord -q -f S16_LE -r 16000 -c 1 "$REC_FILE" &
        rec_pid=$!
        active_backend="arecord"
      else
        notify "Fehler: ffmpeg-Aufnahme fehlgeschlagen und arecord fehlt."
        exit 1
      fi
    fi
  elif [ "$BACKEND" = "dummy" ]; then
    if ! command -v ffmpeg >/dev/null 2>&1; then
      notify "Fehler: ffmpeg nicht gefunden."
      exit 1
    fi
    ffmpeg -y -hide_banner -loglevel error -f lavfi -i anullsrc=r=16000:cl=mono -ac 1 -ar 16000 "$REC_FILE" &
    rec_pid=$!
  else
    notify "Fehler: unbekanntes AUDIO_BACKEND '$BACKEND' (arecord|ffmpeg|dummy)"
    exit 1
  fi

  sleep 0.15
  if ! kill -0 "$rec_pid" 2>/dev/null; then
    rm -f "$REC_FILE"
    notify "Fehler: Aufnahme konnte nicht gestartet werden (${active_backend})."
    exit 1
  fi

  cat > "$STATE_FILE" <<EOF
REC_PID=$rec_pid
BACKEND=$active_backend
STARTED_AT=$(date +%s)
EOF
  notify "Aufnahme gestartet (${active_backend}). Hotkey erneut drücken zum Stoppen." "start"
}

stop_and_transcribe() {
  local rec_pid
  rec_pid="$(sed -n 's/^REC_PID=//p' "$STATE_FILE" | head -n1)"
  if [ -n "$rec_pid" ]; then
    kill -INT "$rec_pid" >/dev/null 2>&1 || true
    wait "$rec_pid" 2>/dev/null || true
  fi
  rm -f "$STATE_FILE"

  if [ ! -s "$REC_FILE" ]; then
    notify "Keine Audio-Daten erkannt." "stop"
    rm -f "$REC_FILE"
    exit 1
  fi

  notify "Transkribiere..." "stop"
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
