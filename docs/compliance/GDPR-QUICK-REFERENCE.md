# GreenLog GDPR Quick-Reference

**Für Entwickler & Produkt-Team**  
**Status: ⚠️ Muss noch umgesetzt werden**

---

## 🔴 Müssen wir HINGEKAUFEN (Critical)

### 1. Consent für Health Data (Art. 9)
```
Checkbox beim Signup mit Text:
"Ich willige ein, dass GreenLog meine medizinischen Cannabis-Daten 
verarbeitet. Ich kann diese Einwilligung jederzeit widerrufen."
[ ] Ja, ich stimme zu
```
**Wo:** Signup-Flow  
**Speichern:** consent_logs Tabelle (user_id, timestamp, version, ip)

### 2. Account-Löschung (Art. 17)
```typescript
// Muss können:
1. Alle User-Daten löschen (profiles, ratings, grows, grow_entries)
2. Profile Pictures aus Storage löschen
3. Sessions invalidieren
4. AVV mit Supabase/Vercel prüfen
```
**Wo:** Account-Einstellungen → "Account löschen"

### 3. Datenexport (Art. 20)
```typescript
// JSON-Export aller User-Daten:
{
  profile: {...},
  ratings: [...],
  grows: [...],
  grow_entries: [...],
  badges: [...],
  consent_log: [...]
}
```
**Wo:** Account-Einstellungen → "Daten exportieren"

---

## 🟡 Müssen wir PROGRAMMIEREN (Important)

### 4. Drittland-Hinweis in Datenschutzerklärung
- Supabase & Vercel = USA
- Prüfen: EU-US Data Privacy Framework aktiv?
- Falls nicht: SCCs oder Consent erforderlich

### 5. Cookie-Banner
- Analytics-Cookies erst nach Consent setzen
- Self-Service in Account-Settings

### 6. Double-Opt-In für E-Mail-Marketing
- Nicht beim Signup, nur wenn User sich extra anmeldet
- Timestamp + IP speichern

### 7. profile_visibility Default = 'private'
- Privacy by Design
- Neue User starten mit privatem Profil

---

## 🟢 sollten wir PLANEN (Recommended)

### 8. Datenschutzbeauftragter
- Ab 10 Mitarbeitern mit regelmäßiger DS-Verarbeitung empfohlen
- Für Startup-Phase evtl. noch nicht nötig

### 9. AVV mit Supabase
- Supabase Privacy + DPA prüfen
- https://supabase.com/privacy

### 10. Incident Response Plan
- Was tun bei Data Breach?
- 72h Meldepflicht an Aufsichtsbehörde

---

## 📋 Daten-Flows die ihr prüfen müsst

### Signup
```
User gibt Email/Passwort ein
    ↓
Checkbox: Consent für Health-Data-Verarbeitung
    ↓
Supabase: profiles + auth.users erstellen
    ↓
consent_logs speichern (consent_type, timestamp, ip)
    ↓
Account aktiv
```

### Datenexport
```
User klickt "Daten exportieren"
    ↓
API: Alle Daten aus allen Tabellen für user_id holen
    ↓
JSON generieren
    ↓
Download
```

### Account-Löschung
```
User klickt "Account löschen"
    ↓
Confirm: "Dies kann nicht rückgängig gemacht werden"
    ↓
1. auth.users disable (nicht löschen — RLS!)
2. profiles löschen
3. ratings löschen (Cascade)
4. grows löschen (Cascade)
5. grow_entries löschen (Cascade)
6. Storage Files löschen
7. Sessions invalidieren
    ↓
 "Account wurde gelöscht"
```

---

## ⚠️ Was ihr NICHT vergessen dürft

- [ ] **Impressum** — Wer ist die Firma? Rechtlich erforderlich
- [ ] **Kontakt** — datenschutz@greenlog.app muss funktionieren
- [ ] **SSL** — Ist HTTPS überall aktiv? (Vercel default = ja)
- [ ] **Passwörter** — Sind die wirklich gehashed? (bcrypt)
- [ ] **Logs** — IP-Adressen in Logs = personenbezogene Daten

---

## 📁 Dateien

| Datei | Pfad |
|-------|------|
| Diese Quick-Reference | docs/compliance/GDPR-QUICK-REFERENCE.md |
| Vollständige Checkliste | docs/compliance/GDPR-CHECKLISTE.md |
| Datenschutzerklärung (DE) | docs/compliance/DATENSCHUTZERKLÄRUNG.md |
| Privacy Policy (EN) | docs/compliance/PRIVACY-POLICY.md |
| Datenschutz-Seite (DE) | src/app/(legal)/datenschutz/page.tsx |
| Privacy-Seite (EN) | src/app/(legal)/en/privacy/page.tsx |
