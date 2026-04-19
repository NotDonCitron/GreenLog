# Manuelle Testfälle – Organization Settings (Bugfix: Loader bei activeOrganization === undefined)

Dieser Bugfix stellt sicher, dass auf den Einstellungsseiten der Organisation ein Ladebildschirm angezeigt wird, solange die aktive Organisation noch nicht bestimmt wurde (`undefined` oder `null` während des Ladens).

## Test-Voraussetzungen
- Ein registrierter Benutzer.
- (Optional) Der Benutzer ist Mitglied in mindestens einer Organisation.
- Zugriff auf die Entwickler-Tools des Browsers (Network Throttling).

---

## Testfall 1: Initiales Laden der Organisationseinstellungen (Loader-Sichtbarkeit)
**Ziel:** Verifizieren, dass der Loader erscheint, bevor die Organisationsdaten verfügbar sind.

1. Öffne die Entwickler-Tools des Browsers.
2. Navigiere zum Reiter **Network** (Netzwerk) und stelle das Throttling auf **Fast 3G** oder **Slow 3G**.
3. Navigiere zu **Profil → [Aktive Organisation] → Einstellungen**.
4. **Erwartetes Ergebnis:**
   - Ein zentrierter Spinner (Loader2) auf dunklem Hintergrund ist sofort sichtbar.
   - Der Loader bleibt sichtbar, solange `activeOrganization` im Hintergrund geladen wird.
   - Erst wenn die Daten geladen sind, erscheint das Formular mit den Organisationseinstellungen.

---

## Testfall 2: Laden der Einladungs-Verwaltung
**Ziel:** Sicherstellen, dass die Einladungsseite korrekt wartet.

1. Aktiviere erneut Network Throttling (**Slow 3G**).
2. Navigiere zu **Profil → [Aktive Organisation] → Einstellungen → Admins & Rollen**.
3. **Erwartetes Ergebnis:**
   - Der Loader ist sichtbar.
   - Es findet kein "Flash" von leeren Inhalten oder Fehlermeldungen statt.
   - Sobald `activeOrganization` geladen ist (und der Benutzer die Berechtigung hat), wird die Liste der Einladungen angezeigt.

---

## Testfall 3: Laden der Ausstehenden Anfragen
**Ziel:** Verifizieren des Verhaltens auf der Seite für ausstehende Anfragen.

1. Navigiere zu **Profil → [Aktive Organisation] → Einstellungen → Ausstehende Anfragen** bei gedrosseltem Netzwerk.
2. **Erwartetes Ergebnis:**
   - Der Loader erscheint zentriert, während `activeOrganization` bestimmt wird.
   - Ein zweiter, inhaltsspezifischer Loader erscheint, während die Liste der ausstehenden Anfragen geladen wird.
   - Nach Abschluss des Ladevorgangs werden die Anfragen oder ein Leere-Zustand angezeigt.

---

## Testfall 4: Verhalten ohne Organisations-Mitgliedschaft
**Ziel:** Prüfen, ob der Loader dauerhaft angezeigt wird oder eine Umleitung erfolgt, wenn keine Organisation vorhanden ist.

1. Logge dich mit einem Benutzer ein, der in **keiner** Organisation Mitglied ist.
2. Navigiere direkt zur URL `/settings/organization`.
3. **Erwartetes Ergebnis:**
   - Da `activeOrganization` dauerhaft `null` bleibt (nachdem `membershipsLoading` auf `false` gesprungen ist), sollte der Loader weiterhin sichtbar sein (gemäß aktuellem Code-Stand) oder eine entsprechende Meldung/Umleitung erfolgen.
   - *Hinweis:* Der aktuelle Fix fokussiert sich auf die Vermeidung von Abstürzen/Fehlanzeigen während des Ladezustands (`undefined`).

---

## Testfall 5: Schneller Tab-Wechsel während des Ladens
**Ziel:** Stabilität bei schnellen Navigationsänderungen.

1. Starte auf der Hauptseite der Organisationseinstellungen.
2. Klicke schnell nacheinander auf verschiedene Unterseiten (Admins & Rollen, Ausstehende Anfragen, Aktivitäten), während das Netzwerk gedrosselt ist.
3. **Erwartetes Ergebnis:**
   - Jede Seite zeigt konsistent den Loader an.
   - Es treten keine React-Fehler (z.B. "Cannot read property 'role' of undefined") in der Konsole auf.

---

## Testergebnisse (16. April 2026)
**Status:** ✅ **PASS**
**Kommentar des Testers:** "PASS: Loader dreht sich, kein weißer Screen/Flash, korrekte Weiterleitung nach Ladeende"

---

## Betroffene Seiten (Checkliste für manuelle Prüfung)
- [x] `/settings/organization` (Hauptseite)
- [x] `/settings/organization/invites`
- [x] `/settings/organization/members`
- [x] `/settings/organization/pending-members`
- [x] `/settings/organization/activities`
- [x] `/settings/organization/csc/export`
- [x] `/settings/organization/csc/dispensations`
- [x] `/settings/organization/csc/destructions`
