# GreenLog — Rechtliche Lage & Compliance (April 2026)

**Status:** Für Team-Diskussion  
**Quellen:** Claude Code Analyse, eigene Recherche

---

## 🇩🇪 Rechtliche Lage Deutschland

### Was seit April 2024 legal ist ✅

- Privatbesitz bis 25g (öffentlich) / 50g (privat)
- Anbau von bis zu 3 Cannabispflanzen zu Hause
- Cannabis Social Clubs (Anbauvereinigungen) seit Juli 2024 erlaubt

### Was für Anbauvereinigungen gilt 📋

- Nicht-gewerblich – kein Verkauf an Dritte
- Max. 25g/Tag pro Mitglied, 50g/Monat
- Mindestabstand 100m zu Schulen/Jugendeinrichtungen
- **Dokumentationspflichten:** Anbau- und Abgabedokumentation, Bestandslisten
- Jährliche Berichte an Behörden

---

## ✅ Was euch NICHT behindert

| Feature | Rechtliche Einschätzung |
|---------|------------------------|
| Strain-Datenbank | ✅ Komplett unbedenklich – öffentlich zugängliche Infos |
| Strain-Bewertungen | ✅ Unbedenklich – Like/Favorite-System wie Leafly |
| Follower/Social Graph | ✅ Kein Bezug zu Konsum |
| Activity Feed | ✅ Öffentliche Events |
| Badge System | ✅ Gamification |
| Kommentare auf Strain-Seiten | ✅ Öffentliche Kommunikation |
| Club-Mitgliederverwaltung | ✅ Pflicht für Clubs – genau das was sie brauchen |
| Saved Filter Presets | ✅ Unbedenklich |
| Strain-Vergleich | ✅ Unbedenklich |
| Saved Search Filters | ✅ Unbedenklich |

---

## ⚠️ Was ihr vorsichtig angehen müsst

| Feature | Risiko | Empfehlung |
|---------|--------|------------|
| **Grow Journal** | 🔴 **Hoch** | **Pausiert** – Anbau über 3 Pflanzen in Deutschland illegal |
| Bestandslisten führen | 🟡 Mittel | Nur Club-Admins sehen, nicht öffentlich im Feed |
| QR-Scanner für Strains | 🟢 Niedrig | Nur eigene Strains scannen, in Club-Kontext unbedenklich |
| Club-spezifischer Katalog | 🟢 Niedrig | ✅ Okay wenn nur gelistet, keine "Bestellung" |
| AI Recommendations | 🟡 Mittel | Keine sensiblen Gesundheitsdaten speichern |
| Analytics Dashboard | 🟡 Mittel | Nur aggregierte Daten, keine individuellen Konsumdaten |
| "Momente" / Stories | 🟢 Niedrig | ✅ Okay wenn öffentliche Inhalte |

---

## 🎯 Struktur-Empfehlung

```
🌿 GreenLog (public — Strain DB + Social)
    └── 🏪 GreenLog Clubs (B2B — Club-spezifisch, RLS-geschützt)
            └── Bestandsverwaltung (nur Club-intern, nicht öffentlich)
```

---

# 🛡️ GDPR & Datenschutz

## Aktuelle Situation

### ✅ Supabase — Gute Neuigkeiten

| Check | Status |
|-------|--------|
| **Region** | West EU (Ireland) — in der EU/EWR |
| **Drittlandtransfer** | ❌ Keiner nötig für Datenbank |
| **GDPR-Compliance** | ✅ Daten verlassen nicht die EU |

**Bedeutung:** Eure Datenbank läuft in Irland (EU). Das löst das größte GDPR-Problem.

### ⚠️ Vercel Hosting — Muss noch geprüft werden

Vercel ist ein US-Unternehmen. Prüft in eurem Dashboard:
- **Project → Settings → Regions → Europe** auswählen
- Alternativ: Migration zu Netlify (EU-Regionen)

---

## 🔴 Was ihr SOFORT tun müsst

### 1. Consent für Health Data (Art. 9 DSGVO)

Da GreenLog medizinisches Cannabis trackt, verarbeitet ihr implizit **Gesundheitsdaten** (Art. 9).

| Was | Wie |
|-----|-----|
| **Checkbox beim Signup** | "Ich willige ein, dass GreenLog meine medizinischen Cannabis-Daten verarbeitet." |
| **Consent loggen** | Tabelle `consent_logs`: user_id, timestamp, version, ip |

### 2. Account-Löschung implementieren (Art. 17)

User müssen ihre Daten vollständig löschen können.

```
1. auth.users deaktivieren (nicht löschen wegen RLS!)
2. profiles löschen
3. ratings löschen (Cascade)
4. grows löschen (Cascade)
5. grow_entries löschen (Cascade)
6. Storage Files löschen
7. Sessions invalidieren
```

### 3. Datenexport implementieren (Art. 20)

User müssen ihre Daten als JSON exportieren können.

---

## 🟡 Was ihr diese Woche programmieren solltet

| Feature | Priorität |
|---------|-----------|
| Consent-Checkbox beim Signup | 🔴 Hoch |
| Account-Löschung | 🔴 Hoch |
| Datenexport (JSON) | 🔴 Hoch |
| Cookie-Banner für Analytics | 🟡 Mittel |
| profile_visibility Default = 'private' | 🟡 Mittel |

---

## 🟢 Empfohlene Maßnahmen (nächster Monat)

| Was | Warum |
|-----|-------|
| Datenschutzbeauftragter bestellen | Ab 10 Mitarbeitern mit DS-Verarbeitung empfohlen |
| AVV mit Supabase prüfen | Auftragsverarbeitungsvertrag |
| Cookie Consent Manager | Usercentrics oder Borlabs |
| Incident Response Plan | 72h Breach-Meldepflicht |

---

## 📁 Erstellte Dateien (docs/compliance/)

| Datei | Beschreibung |
|-------|-------------|
| `GDPR-CHECKLISTE.md` | Vollständige Checkliste mit allen Anforderungen |
| `GDPR-QUICK-REFERENCE.md` | Quick-Reference für Entwickler |
| `DATENSCHUTZERKLÄRUNG.md` | Umfassende Datenschutzerklärung (DE) |
| `PRIVACY-POLICY.md` | Englische Version |
| `LEGAL-SUMMARY.md` | Diese Zusammenfassung |

---

## 📊 Hosting-Optionen (falls Vercel nicht EU-konform ist)

| Anbieter | EU-Regionen | Next.js | Preis | Aufwand |
|----------|-------------|---------|-------|---------|
| **Netlify** | EU (Frankfurt) | ✅ Native | Free | Minimal |
| **Cloudflare Pages** | EU verfügbar | ✅ Native | Free bis 500GB | Minimal |
| **Vercel (aktuell)** | Europe wählbar | ✅ Native | Free | Minimal |

**Empfehlung:** Bleibt bei Vercel und aktiviert EU-Region.

---

## 💡 Fazit für die Diskussion

### Was können wir sofort umsetzen?

1. ✅ Alle Social/Community-Features (Follower, Feed, Badges, Kommentare)
2. ✅ Strain-Datenbank und Bewertungen
3. ✅ Club-Mitgliederverwaltung (exakte Feature für Anbauvereinigungen)
4. ✅ RLS-Policies für Club-interne Daten

### Was braucht noch Arbeit?

1. 🔴 **Grow Journal** — bleibt pausiert (3-Pflanzen-Limit)
2. 🔴 **GDPR-Consent** — muss programmiert werden
3. 🔴 **Account-Löschung** — muss programmiert werden
4. 🟡 **Datenexport** — für GDPR-Compliance

### Was ist die beste Strategie?

**Fokus auf:**
- 🌿 **GreenLog Public** — Strain DB + Social (für alle)
- 🏪 **GreenLog Clubs** — B2B für Anbauvereinigungen ( paid)
- 📊 **Compliance-Features** — Dokumentationspflichten der Clubs

---

*Erstellt: April 2026*
