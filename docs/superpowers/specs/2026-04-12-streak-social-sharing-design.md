# Spec: Streak-System + Social Sharing Cards
**Datum:** 2026-04-12
**Status:** Entwurf

---

## 1. Streak-System

### Konzept
Gamification-Element, das die Nutzerbindung fördert. Ein Streak zählt Tage in Folge, an denen der User mindestens eine Aktivität auf CannaLog durchführt. Strategisch wichtig: Der Streak belohnt App-Interaktion (Strain sammeln, bewerten, folgen) — nicht Konsum. Damit ist er 100 % KCanG-konform (§ 6 Werbeverbot).

### Was als "geloggt" gilt
Jede Aktivität zählt:
- Strain zur Sammlung hinzufügen
- Bewertung abgeben
- Einer Community beitreten
- Jemandem folgen

### Anzeige: Stats-Leiste
Zwischen Header und Content, oberhalb des Hauptinhalts.

```
12 Strains | 4 Bewertungen | 7🔥 Streak
```

Format: `[Strain-Count] Strains | [Rating-Count] Bewertungen | [Streak]🔥 Streak`

Komponenten:
- `StreakCounter` — zeigt aktuellen Streak-Tag + Feuer-Icon
- Wird in `StatsBar` integriert (neue Komponente oder Erweiterung bestehender Layout-Komponente)
- Die Stats-Leiste ist nur für eingeloggte User sichtbar

### Badge
Vorhandener Badge `streak-7` in `src/lib/badges.ts` — Kriterium: 7 Tage in Folge mindestens eine Aktivität in `user_activities`.

### Technischer Gap — MUSS gefixt werden
**Problem:** `user_activities` wird aktuell nicht bei Collection-Events geschrieben. Der Badge-Check für `streak-7` liest aber `user_activities`.

**Fix:** In der API-Route, die Strains zur Sammlung hinzufügt (oder per Supabase Database Trigger), muss ein `user_activities`-Eintrag mit `activity_type: 'strain_collected'` geschrieben werden.

**Tabelle:** `user_activities`
```sql
id UUID PRIMARY KEY,
user_id TEXT REFERENCES profiles(id),
activity_type TEXT,  -- 'rating', 'strain_collected', 'follow', etc.
target_id TEXT,
target_name TEXT,
target_image_url TEXT,
metadata JSONB DEFAULT '{}',
is_public BOOLEAN DEFAULT true,
created_at TIMESTAMPTZ DEFAULT now()
```

---

## 2. Social Sharing Cards

### Konzept
Kann-konformes Teilen von Strain-Daten als "Analytisches Profil" / "Labor-Datenblatt". Keine Sterne, keine subjektiven Texte, keine Handlungsaufforderung. Das Bild wird als private 1-zu-1-Empfehlung über WhatsApp/Telegram geteilt — nicht als öffentlicher Social-Media-Post.

### Design der Share-Card (OG-Image)
- **Heller Lab-Look:** Weiß/grau Hintergrund, schlicht und "schmucklos"
- **Header:** "Analytisches Profil" ( groß, sachlich)
- **Inhalt:** Strain-Name, Genetik, THC/CBD-Werte, Terpen-Radar-Chart
- **Branding:** GreenLog Logo klein unten
- **Keine Sterne, keine subjektiven Texte, keine Emojis, keine werblichen Slogans**

### OG-Image-Route erweitern
Existierende Route `src/app/api/og/route.tsx` erweitern um Query-Parameter:
- `?name=` — Strain-Name
- `?genetics=` — Genetik
- `?thc=` — THC-Gehalt
- `?cbd=` — CBD-Gehalt
- `?terpenes=` — JSON-Array der Terpene (für Radar-Chart)
- `?image=` — Strain-Bild-URL

Die Route bleibt auf Edge Runtime.

### Share-Trigger 1: Passiver Toast (nach Bewertung)
 Erscheint nach dem Speichern einer Bewertung.

**Text:**
> "Eintrag gespeichert. 📤 Labor-Datenblatt weiterleiten"

**Verhalten:**
- Erscheint unten am Bildschirmrand
- Verschwindet nach 3 Sekunden (kein Manueles Schließen)
- Kein Pop-up, keine Modal, keine aggressive Handlungsaufforderung
- Der Button "Labor-Datenblatt weiterleiten" öffnet das Share-Modal (Trigger 3)

**Wording legal:** Kein "Teilen!", kein "Empfehlen!", kein "Schick das an Freunde!" — nur der neutrale Hinweis auf das Datenblatt.

### Share-Trigger 2: Permanenter Button (Strain-Detailseite)
Auf der Strain-Detailseite, über oder unter dem Terpen-Radar-Chart.

- **Icon:** Share-Icon (Lucide React: `Share2` oder `Upload`)
- **Tooltip:** "Chemische Analyse teilen"
- **Platzierung:** Nicht neben den Sterne-Bewertung, sondern visuell beim Terpen-Radar — rahmt das Teilen als wissenschaftlichen Akt ein
- Öffnet beim Klick das Share-Modal

### Share-Modal (Custom)
Kein System-Share-Sheet — eigene Custom-Buttons für volle Kontrolle über den Caption-Text.

**Buttons:**
1. **WhatsApp** — öffnet `https://wa.me/?text=...` mit vordefiniertem Text
2. **Telegram** — öffnet `https://t.me/share/url?url=...&text=...`
3. **Link kopieren** — kopiert URL in Clipboard, zeigt "Kopiert!" Feedback

**Fester Caption-Text (manipulationssicher, nicht änderbar):**
> "Labor-Datenblatt für [Strain-Name]. Quelle: GreenLog Datenbank."

**Kein Instagram, kein Facebook, kein Twitter/X** — diese Kanäle werden nicht angeboten.

### Datenschutz / Compliance (§ 6 KCanG)
- Keine Sterne-Ratings auf der Karte
- Keine subjektiven Review-Texte des Nutzers
- Kein AIDA-Modell-konformes Handlungselement ("Action" wird durch den neutralen Toast vermieden)
- Die Karte enthält nur objektive, labortechnische Daten
- Das Teilen ist auf private Kanäle (WhatsApp, Telegram) beschränkt
- Der Caption-Text ist serverseitig fest vorgegeben

---

## Technische Übersicht

### Neue/Geänderte Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|-------------|
| `src/app/api/og/route.tsx` | Erweitern | Neue Query-Parameter für Strain-Daten |
| `src/components/social/share-modal.tsx` | Neu | Custom Share-Modal mit WhatsApp/Telegram/Link |
| `src/components/social/streak-counter.tsx` | Neu | Streak-Counter mit Feuer-Icon |
| `src/components/layout/stats-bar.tsx` | Neu | Stats-Leiste (Strains + Ratings + Streak) |
| `src/app/api/activities/log/route.ts` | Neu | Schreibt user_activities für Collection-Events |
| `src/lib/badges.ts` | Prüfen | streak-7 Kriterium prüfen (sollte bereits funktionieren) |
| `supabase-schema.sql` | Prüfen | user_activities Trigger für strain_collected prüfen |

### Datenbank-Trigger (optional statt API-Route)
Alternativ zur API-Route: Supabase Database Trigger auf `user_collection` INSERT, der automatisch einen `user_activities`-Eintrag erzeugt.

### API-Route: Bewertung + Activity
Die API-Route, die Bewertungen speichert, muss ebenfalls einen `user_activities`-Eintrag schreiben.

### Keine neuen Tabellen nötig
- `user_activities` existiert bereits
- `streak-7` Badge existiert bereits
- Alle Datenstrukturen sind vorhanden

---

## Erste Implementierungs-Schritte

1. **user_activities Bug fix** — Collection-Events müssen nach `user_activities` geschrieben werden (Database Trigger oder API-Route)
2. **Stats-Leiste** bauen mit Streak-Counter
3. **OG-Image Route** erweitern für Strain-spezifische Parameter
4. **Share-Modal** mit Custom-Buttons
5. **Toast-Nachricht** nach Bewertung
6. **Permanenter Share-Button** auf Strain-Detailseite
7. **Badge-Check** nach jeder Activity (existierende Infrastructure prüfen)
