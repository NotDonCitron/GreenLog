# Voice Input (Local, faster-whisper)

## Setup

```bash
./tools/voice-stt/setup.sh
```

## Use

8 Sekunden aufnehmen und transkribieren:

```bash
./tools/voice-stt/voice-stt.sh 8
```

## PTT-Modus (Start/Stop per Enter)

```bash
PTT_MODE=1 ./tools/voice-stt/voice-stt.sh
```

Ablauf:
- Enter drücken = Aufnahme starten
- nochmal Enter = Aufnahme stoppen
- danach wird direkt transkribiert

## Globales Hotkey-PTT (empfohlen)

Toggle-Script (1x drücken = Start, 1x drücken = Stop + Transkript):

```bash
./tools/voice-stt/voice-stt-toggle.sh
```

Standard:
- Modell: `tiny`
- Sprache: `de`
- Ergebnis zusätzlich in `tools/voice-stt/.tmp/last-transcript.txt`
- Wenn `wl-copy` da ist, landet der Text auch in der Zwischenablage.

### KDE Shortcut auf AltGr legen

1. `Systemeinstellungen` -> `Kurzbefehle` -> `Benutzerdefinierte Kurzbefehle`
2. Neue Aktion erstellen (`Befehl/URL`)
3. Befehl:

```bash
/home/phhttps/Dokumente/Greenlog/GreenLog/tools/voice-stt/voice-stt-toggle.sh
```

4. Tastenkürzel zuweisen: `Right Alt` / `AltGr`

Hinweis: Je nach Layout lässt KDE `AltGr` allein nicht immer zu. Fallback:
- `Meta+AltGr` oder
- `F8`

Mit kleinem Modell (schneller):

```bash
WHISPER_MODEL=tiny ./tools/voice-stt/voice-stt.sh 8
```

Turbo-Setup (deutlich schneller):

```bash
WHISPER_MODEL=tiny WHISPER_BEAM_SIZE=1 WHISPER_VAD=0 ./tools/voice-stt/voice-stt.sh 8
```

Englisch statt Deutsch:

```bash
WHISPER_LANG=en ./tools/voice-stt/voice-stt.sh 8
```

## Audio Backend

Default ist `arecord`.

Falls `arecord` auf deinem Desktop nicht geht:

```bash
AUDIO_BACKEND=ffmpeg ./tools/voice-stt/voice-stt.sh 8
```

PTT + ffmpeg:

```bash
AUDIO_BACKEND=ffmpeg PTT_MODE=1 ./tools/voice-stt/voice-stt.sh
```

Schnelles PTT-Profil:

```bash
PTT_MODE=1 WHISPER_MODEL=tiny WHISPER_BEAM_SIZE=1 WHISPER_VAD=0 ./tools/voice-stt/voice-stt.sh
```

## Hinweise

- Beim ersten Lauf wird das Whisper-Modell geladen (kann kurz dauern).
- Wenn kein Mikro gefunden wird, prüfe PipeWire/PulseAudio und Mic-Berechtigungen.
