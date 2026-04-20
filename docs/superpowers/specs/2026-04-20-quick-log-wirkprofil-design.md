# Quick Log Wirkprofil Design

## Ziel

GreenLog soll Nutzer nicht nur Strains mit Sternen bewerten lassen, sondern ein persoenliches Wirkgedaechtnis aufbauen. Der Kern ist ein Quick Log, der in etwa 20 Sekunden ausgefuellt werden kann und trotzdem genug Struktur fuer spaetere persoenliche Wiedererkennung liefert.

Die Funktion ersetzt reine Sterne nicht. Sterne bleiben als schnelles Gesamturteil erhalten, werden aber durch Wirkchips, privaten Status und optionale Notizen ergaenzt.

## Produktprinzipien

- Der Quick Log ist privat-first.
- Oeffentliche Inhalte entstehen nur freiwillig nach dem Speichern.
- Sensible Konsumdetails werden nicht oeffentlich geteilt.
- Die Eingabe bleibt kurz genug fuer mobile Nutzung direkt nach einer Erfahrung.
- GreenLog sammelt vergleichbare Daten, ohne Nutzer in lange Formulare zu zwingen.

## V1 Flow

1. Nutzer startet einen Quick Log fuer einen Strain.
2. Nutzer waehlt oeffentliche Wirkchips aus:
   - Ruhe
   - Fokus
   - Schlaf
   - Kreativitaet
   - Appetit
3. Nutzer kann private Nebenwirkungen auswaehlen, zum Beispiel:
   - trocken
   - unruhig
   - kopflastig
   - couchlock
4. Nutzer vergibt Sterne als persoenliches Gesamturteil.
5. Nutzer waehlt einen privaten Status:
   - Nochmal
   - Situativ
   - Nicht nochmal
6. Nutzer kann optional eine private Notiz hinterlegen.
7. Nach dem Speichern kann Nutzer optional einen oeffentlichen Kurzreview erstellen.

## Oeffentlicher Kurzreview

Der oeffentliche Kurzreview ist ein freiwilliger zweiter Schritt nach dem privaten Speichern. Er soll Traffic und hilfreiche Community-Inhalte erzeugen, ohne den privaten Log zu entwerten.

Oeffentlich sichtbar sein duerfen:

- Sterne
- Strain-Bezug
- die V1-Wirkchips Ruhe, Fokus, Schlaf, Kreativitaet und Appetit
- ein freiwilliger Kurzreviewtext

Nicht oeffentlich sichtbar sein duerfen:

- Nebenwirkungen
- Status Nochmal, Situativ oder Nicht nochmal
- Dosis
- Charge
- Apotheke
- genaue Konsumzeit
- genaues Setting
- private Notiz

## Private Notiz

Die private Notiz ist optional und soll im Quick Log nicht dominant sein. Die empfohlene UI ist ein einklappbarer Bereich mit der Aktion `+ Private Notiz`.

Die Notiz dient fuer Details, die strukturierte Chips nicht gut abbilden:

- Dosis-Erfahrung, zum Beispiel "0,2g gut, 0,4g zu schwer"
- persoenliches Setting, zum Beispiel "nicht vor Arbeit"
- Vergleich, zum Beispiel "aehnlich wie Wedding Cake, aber trockener"
- zeitlicher Verlauf, zum Beispiel "nach 45 Minuten kopflastig"

Die private Notiz bleibt immer privat und wird nicht in oeffentliche Reviews uebernommen.

## Datenschutzregeln

Die V1-Datenschutzregel ist bewusst einfach:

- Vergleichbare, neutrale Erfahrungsdaten koennen freiwillig oeffentlich werden.
- Koerperliche Nebenwirkungen und persoenliche Ausschlussentscheidungen bleiben privat.
- Dosis-, Charge- und Bezugsdaten bleiben privat.

Diese Trennung verhindert, dass Nutzer sensible Details versehentlich teilen, und erhoeht die Chance auf ehrliche private Logs.

## Bestehende Systembeziehung

GreenLog hat bereits:

- `ratings` fuer Sternebewertungen und Reviews
- `consumption_logs` fuer private Konsum-Dokumentation
- Privacy-Regeln fuer oeffentliche Profile und sensible Felder wie Dosis und Charge

Die Funktion sollte daher nicht als komplett neues Bewertungsmodell starten. V1 kann als Erweiterung des bestehenden Konsum-Logs und Rating-Konzepts geplant werden:

- Sterne bleiben kompatibel mit bestehenden Rating-Views.
- Quick-Log-Daten liefern private persoenliche Kontextinformationen.
- Oeffentliche Kurzreviews speisen Profile und Strain-Seiten nur mit freigegebenen Feldern.

## UX-Entscheidungen

- Primaere Eingabe: Chips und Sterne, keine langen Textfelder.
- Private Notiz: optional einklappbar.
- Oeffentliches Teilen: erst nach dem Speichern anbieten.
- `Nicht nochmal`: ausschliesslich privat.
- Nebenwirkungen: ausschliesslich privat.
- V1-Chips klein halten, damit Logs vergleichbar bleiben.

## Nicht in V1

- Automatisch abgeleitete Empfehlungen.
- Komplexe Intensitaets-Slider pro Wirkung.
- Oeffentliche Nebenwirkungsstatistiken.
- Automatische Bewertung aus mehreren Logs.
- Freie oeffentliche Wirkchip-Erweiterungen.
- Medizinische Aussagen oder Therapieempfehlungen.

## Erfolgskriterien

- Nutzer koennen einen Log ohne private Notiz in etwa 20 Sekunden speichern.
- Nutzer koennen einen oeffentlichen Kurzreview ueberspringen, ohne den privaten Log zu verlieren.
- Oeffentliche Review-Daten enthalten keine Dosis, Charge, Nebenwirkungen, privaten Status oder private Notizen.
- Die Funktion erzeugt mehr persoenlichen Nutzwert als reine Sterne, bleibt aber mit bestehenden Sterne-Ansichten kompatibel.

## Offene Implementierungsfragen

- Ob Quick Logs technisch primaer `consumption_logs`, `ratings` oder eine neue Tabelle erweitern, wird im Implementierungsplan entschieden.
- Ob der oeffentliche Kurzreview als eigenes Feld oder als bestehendes Review-Feld gespeichert wird, wird im Implementierungsplan entschieden.
- Ob Nebenwirkungsoptionen fest oder konfigurierbar sind, wird nach Sichtung der vorhandenen UI-Komponenten entschieden.
