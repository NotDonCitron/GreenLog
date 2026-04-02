# GreenLog GDPR Compliance Checkliste

**Stand:** April 2026  
**Status:** Muss noch umgesetzt werden

---

## 🔴 KRITISCH — Rechtliche Pflichten

### 1. Rechtsgrundlage für besondere Kategorien (Art. 9 DSGVO)

**Problem:** Ihr verarbeitet implizit Gesundheitsdaten (Medical Cannabis Indikationen)

| Check | Aufgabe | Status |
|-------|---------|--------|
| ☐ | **Einwilligung (Art. 9(2)(a))** — Explizite, informierte Einwilligung für Health-Data-Verarbeitung einholen | ❌ |
| ☐ | Consent-Text formulieren, der genau erklärt welche Daten (medizinische Indikationen) verarbeitet werden | ❌ |
| ☐ | Consent-Checkbox beim Signup implementieren (nicht vorausgefüllt, kein Pre-Tick) | ❌ |
| ☐ | Consent-Protokoll: Datum, Zeit, Version der Einwilligung speichern | ❌ |
| ☐ | Double-Opt-In für E-Mail-Marketing (separate Einwilligung) | ❌ |

**Empfohlener Consent-Text für Signup:**
```
Ich willige ein, dass GreenLog meine medizinischen Cannabis-Daten 
(Strain-Bewertungen, medizinische Indikationen, Notizen) gemäß 
Art. 9(2)(a) DSGVO verarbeitet. Ich kann diese Einwilligung 
jederzeit widerrufen.
[ ] Ja, ich stimme zu
```

---

### 2. Informationspflichten (Art. 13 DSGVO) — vollständig erfüllen

| Check | Information | Status |
|-------|-------------|--------|
| ☐ | **Identität des Verantwortlichen** (Name, Anschrift, Kontakt) | ⚠️ Vorhanden, aber unvollständig |
| ☐ | **Kontakt Datenschutzbeauftragter** (falls erforderlich) | ❌ Fehlt |
| ☐ | **Zwecke der Verarbeitung** | ⚠️ Vorhanden |
| ☐ | **Rechtsgrundlage** — explizit für jede Datenkategorie | ❌ Fehlt |
| ☐ | **Empfänger** oder Kategorien von Empfängern | ⚠️ Teilweise |
| ☐ | **Drittlandtransfers** (USA/Supabase?) + Garantien | ❌ Fehlt |
| ☐ | **Speicherdauer** oder Kriterien zur Festlegung | ⚠️ Vorhanden |
| ☐ | **Betroffenenrechte** (Auskunft, Löschung, etc.) | ⚠️ Vorhanden |
| ☐ | **Beschwerderecht bei Aufsichtsbehörde** | ❌ Fehlt |
| ☐ | **SSL/TLS** für alle Datenübertragungen | ❌ Zu prüfen |

---

### 3. Betroffenenrechte — Vollständig implementieren

| Check | Recht | Implementierung | Status |
|-------|-------|-----------------|--------|
| ☐ | **Auskunft (Art. 15)** | User kann seine Daten exportieren (Data Export) | ❌ |
| ☐ | **Löschung (Art. 17)** | "Account löschen" + vollständige Datenlöschung | ❌ |
| ☐ | **Berichtigung (Art. 16)** | Profil-Daten bearbeiten | ⚠️ Teilweise |
| ☐ | **Datenübertragbarkeit (Art. 20)** | JSON-Export aller User-Daten | ❌ |
| ☐ | **Widerspruch (Art. 21)** | Marketing-Opt-Out, Datenverarbeitungs-Widerspruch | ❌ |
| ☐ | **Widerruf der Einwilligung** | Einwilligung zurückziehen können | ❌ |

---

### 4. Auftragsverarbeitung (Art. 28 DSGVO)

| Check | Aufgabe | Status |
|-------|---------|--------|
| ☐ | **Auftragsverarbeitungsvertrag (AVV)** mit Supabase prüfen/abschließen | ❌ |
| ☐ | **AVV** mit Vercel prüfen/abschließen | ❌ |
| ☐ | **Unterauftragnehmer** prüfen (wen nutzt Supabase noch?) | ❌ |
| ☐ | **Sicherheit bei Übermittlung** in Drittländer (USA) prüfen | ❌ |

> ⚠️ **Supabase sitzt in den USA** — ihr braucht entweder Standardvertragsklauseln (SCCs) oder einen Nachweis dass Daten in EU verbleiben. Prüft eure Supabase-Konfiguration.

---

## 🟡 WICHTIG — Technische Maßnahmen

### 5. Datensparsamkeit & Zweckbindung

| Check | Aufgabe | Status |
|-------|---------|--------|
| ☐ | Keine unnötigen Daten erheben (z.B. kein Standort wenn nicht nötig) | ⚠️ |
| ☐ | API-Endpoints prüfen: Werden nur notwendige Daten zurückgegeben? | ❌ |
| ☐ | KeineTracking-Pixel ohne Consent | ❌ |
| ☐ | RLS-Policies vollständig (habt ihr bereits — gut!) | ✅ |

---

### 6. Sicherheit (Art. 32 DSGVO)

| Check | Maßnahme | Status |
|-------|----------|--------|
| ☐ | **SSL/TLS** auf allen Verbindungen | ⚠️ |
| ☐ | **Passwort-Hashing** (bcrypt/argon2 — kein Plaintext) | ✅ |
| ☐ | **2FA anbieten** (für医疗-User besonders wichtig) | ❌ |
| ☐ | **Verschlüsselung at rest** (Supabase) | ⚠️ |
| ☐ | **Backup-Verschlüsselung** | ❌ |
| ☐ | **Penetrationstest** oder Security-Audit | ❌ |
| ☐ | **Log-Access** — Wer hat wann auf was zugegriffen? | ❌ |
| ☐ | **Incident-Response-Plan** für Data Breaches (72h Meldepflicht!) | ❌ |

---

### 7. Privacy by Design & Default

| Check | Anforderung | Status |
|-------|-------------|--------|
| ☐ | **Privacy by Default:** Neue User starten mit privatem Profil | ❌ (profile_visibility fehlt) |
| ☐ | **Datenschutz-Folgenabschätzung (DSFA)** wenn nötig (Art. 35) | ❌ |
| ☐ | **Keine unnötigen Cookies** vor Consent | ❌ |

---

## 🟢 OPTIONAL — Empfohlene Maßnahmen

| Check | Maßnahme | Priorität |
|-------|----------|-----------|
| ☐ | **Datenschutzbeauftragter (DSB)** bestellen (ab 10 Mitarbeitern die regelmäßig DS-verarbeiten) | 🟡 |
| ☐ | **Verzeichnis der Verarbeitungstätigkeiten** (Art. 30) erstellen | 🟡 |
| ☐ | **Cookie Consent Manager** (z.B. Usercentrics, Borlabs) implementieren | 🟡 |
| ☐ | **Privacy Policy Versionierung** — Änderungen tracken | 🟢 |
| ☐ | **Cookie-Banner** mit granularer Auswahl | 🟢 |

---

## 📋 Quick Win: Was ihr HEUTE machen könnt

1. **Account-Löschung implementieren** — Löscht alle Daten (profiles, ratings, grows, grow_entries) vollständig
2. **Datenexport** — User können ihre Daten als JSON herunterladen
3. **Consent-Checkbox beim Signup** — auch wenn noch nicht perfekt
4. **Drittland-Hinweis** — Supabase = USA, braucht ihr einen Hinweis in der Datenschutzerklärung
5. **Impressum prüfen** — Ist die Firma rechtsgültig eingetragen? Welche Rechtsform?

---

## 📁 Checkliste-Dateien

- Diese Checkliste: `docs/compliance/GDPR-CHECKLISTE.md`
- Datenschutzerklärung: `docs/compliance/DATENSCHUTZERKLÄRUNG.md`
- Privacy Policy (EN): `docs/compliance/PRIVACY-POLICY.md`
