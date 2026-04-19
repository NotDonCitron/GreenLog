# GreenLog — Was wir April 2026 gemacht haben

**Live:** https://green-log-two.vercel.app

---

## Kurz erklärt

GreenLog ist eine Plattform für Cannabis-Clubs und Apotheken. Wir haben im April viel gebaut:

---

## 1. Neues CSC-Modul — Bestandsverwaltung für Clubs & Apotheken

**Was ist das?**
Ab dem 1. Juli 2024 gilt das KCanG (Cannabis-Gesetz). Clubs und Apotheken müssen jetzt genau dokumentieren, wie viel Cannabis sie haben, wem sie es geben, und was entsorgt wird.

**Was wir gebaut haben:**

- **3 neue Datenbank-Tabellen** für:
  - Eingehende Lieferungen (Chargen)
  - Abgaben an Mitglieder
  - Vernichtungen (z.B. abgelaufen)

- **Automatische Warnungen** bei Überschreitung von:
  - 25g/50g/30g Besitzlimits
  - THC 10% für junge Leute (18-21 Jahre)

- **Neue Rolle** "Präventionsbeauftragter" im System
  - Ist ein Club-Admin für Suchtprävention
  - Gesetzt in § 23 Abs. 4 KCanG

- **4 neue Admin-Seiten** im Einstellungsbereich
  - Batch-Verwaltung
  - Abgaben verfolgen
  - Qualitätsprüfung
  - Vernichtungen melden

---

## 2. Login-System gewechselt

**Was ist passiert?**
Wir haben das alte Login-System (Clerk) durch Supabase Auth ersetzt.

**Warum?**
Die benutzerdefinierte Domain `greenlog-prod.app` war nicht in unserem Besitz. Deshalb ging das alte Login nicht mehr.

**Was ändert sich für Nutzer?**
- Nur noch Email/Passwort möglich
- Kein Google-Login mehr
- Alte Accounts funktionieren nicht mehr

**Was wir gefixt haben:**
- 9 Sicherheitslücken in den API-Schnittstellen
- Neue Admin-Zugänge für Badges und Stapel-Verarbeitung

---

## 3. Neue Grow-Detail-Seite

**Was ist das?**
Eine komplett neue Seite um einzelne Grows (Pflanzen) anzusehen.

**Neue Funktionen:**

- **Timeline** — Alle Einträge eines Grows auf einen Blick
- **PlantCarousel** — Bildkarussell der Pflanzen
- **QuickActionBar** — Schnelle Buttons für Aktionen
- **ReminderPanel** — Erinnerungen kompakt angezeigt
- **LogEntryModal** — Einträge erstellen mit 自动 Type-Auswahl

- **Toggle-Switch** in:
  - Collection
  - Home Widget
  - Social Tab

---

## 4. Test-System aufgebaut

**Was wir getestet haben:**

| Test-Typ | Was getestet wird |
|----------|-------------------|
| E2E (Playwright) | UI: Header, QuickActionBar, Pflanzen-Bilder, Erinnerungen, Timeline |
| Unit (Vitest) | DLI-Rechner (Daily Light Integral) |
| Integration | API: Log-Einträge erstellen, löschen, Berechtigungen |

**Warum?**
Damit wir schneller merken, wenn etwas kaputt geht.

---

## 5. Kleinere Fixes (viele!)

- Collection-Seite: Header verschwindet beim Scrollen
- Strain of the Day: Zeigt nur Apotheken-Strains
- Activity Feed: Stürzt nicht mehr ab wenn Realtime ausfällt
- Feed-URL: Tab-Status bleibt nach Page-Refresh
- `/api/strains`: GET-Bug (war kaputt seit letztem Update)
- Alter-Gate: Race Condition mit localStorage
- Settings: Redirect zu Einstellungs-Seite

---

## Zahlen

- **77 Commits** diesen Monat
- **~20 Vercel Deployments**
- **3 neue DB-Tabellen**
- **9 kritische Sicherheitsfixes**
- **6 Phasen** Code-Qualität durchgearbeitet

---

## Team (April 2026)

- Pascal — Development, Deployment, Supabase
- Claude (KI) — Coding, Reviews, Debugging

---

Fragen? Schreib an pascal.hintermaier@gmail.com
