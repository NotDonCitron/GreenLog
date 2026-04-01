# App Store Release Guide — CannaLog GreenLog

> **Cannabis-Apps unterliegen strengen Richtlinien.** Apple und Google haben spezifische Regeln für Cannabis-/CBD-Produkte. Dieser Guide hilft bei der optimalen Positionierung.

---

## 📋 Übersicht

| Plattform | Status | Risiko | Aufwand |
|-----------|--------|--------|---------|
| Android (Google Play) | ✅ Möglich | 🟡 Mittel | ⏱️ 2–3 Tage |
| iOS (Apple App Store) | ⚠️ Eingeschränkt | 🔴 Hoch | ⏱️ 1–2 Wochen |
| PWA / Web | ✅ Ready | 🟢 Niedrig | ⏱️ 1 Tag |

**Empfehlung:** PWA zuerst ausrollen (sofort), dann Android Play Store, iOS als low-priority.

---

## 🌐 PWA (Progressive Web App) — SOFORT

Dein Service Worker + manifest.json sind **bereits implementiert**.

### Was du tun musst:

1. **HTTPS** — greenlog.app muss HTTPS haben (Vercel ✅)
2. **Service Worker** — bereits in `/public/sw.js` + registriert ✅
3. **manifest.json** — bereits vorhanden in `/public/manifest.json` ✅
4. **Deep Links** — `/.well-known/apple-app-site-association` + `assetlinks.json` — Dateien sind vorbereitet, aber **TEAM_ID + Fingerprints fehlen** (manuell)

### Deep Links fertig machen:

**iOS — `apple-app-site-association`:**
```json
{
  "applinks": {
    "details": [{
      "appID": "DEIN_TEAM_ID.com.greenlog.app",
      "paths": ["/strains/*", "/collection", "/profile", "/community/*", "/feed", "/discover", "/invite/*"]
    }]
  }
}
```
→ Bekomme deine Team ID von [developer.apple.com](https://developer.apple.com) → Account → Membership

**Android — `assetlinks.json`:**
```json
[{
  "relation": ["delegate_permission/common.view_registered_domain"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.greenlog.app",
    "sha256_cert_fingerprints": ["DEIN_DEBUG_FINGERPRINT", "DEIN_RELEASE_FINGERPRINT"]
  }
}]
```
→ Debug: `keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore | openssl sha256 -binary | base64`
→ Release: SHA-256 von deinem Play Store Signing Key

---

## 🤖 Android — Google Play Store

### Richtlinien (Stand 2024)

Google erlaubt **Cannabis-Apps** unter folgenden Bedingungen:
- Keine direkten Verkäufe oder Bestellungen
- Keineillegalen Inhalte
- Altersfreigabe: **PEGI 18** oder **RS 18** (Germany)
- **Disclaimer erforderlich:** "Kein Verkauf an Personen unter 18/21"

### Checkliste

- [ ] **Produktseite** auf Deutsch + Englisch
- [ ] **Screenshots:** 5–8 Stück (Phone + Tablet)
- [ ] **App-Kategorie:** Lifestyle / Medical
- [ ] **Altersfreigabe:** RS 18 (Germany)
- [ ] **Datenschutzerklärung:** HTTPS-URL erforderlich
- [ ] **Support-URL + Impressum:** HTTPS
- [ ] **App-Signing:** Play App Signing aktivieren
- [ ] **Datenschutzformular:** Google Play Console → App-Inhalte → Datenschutz → ausfüllen
- [ ] **Werbe-ID:** In der App deklarieren (falls zutreffend)
- [ ] **APK/AAB:** Mit `npm run build && npx next build` bauen

### Build erstellen

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog

# Production Build
npm run build

# Ergebnis: .next/greenlog-app.aab oder .apk
# (Next.js deployt auf Vercel, kein lokaler AAB nötig)
```

### Einzureichen

1. [Google Play Console](https://play.google.com/console) → App erstellen
2. Alle Screenshots + Descriptions hochladen
3. Datenschutz-URL: `https://greenlog.app/datenschutz`
4. Impressum-URL: `https://greenlog.app/impressum`
5. Support-URL: `https://greenlog.app`
6. RS 18-Altersfreigabe beantragen

---

## 🍎 iOS — Apple App Store

### Richtlinien (Stand 2024)

**Apple ist strikter.** Cannabis-Apps sind im App Store **eingeschränkt erlaubt** aber werden oft abgelehnt, es sei denn:
- Der Entwickler hat eine **lizenzierte Cannabis-Apotheke / Club** als Unternehmen
- Die App ist **medizinisch** ausgerichtet (nicht Freizeit)
- Strikte **Altersverifikation** ist implementiert

### Was Apple typischerweise ablehnt

- "Facilitating the purchase or delivery of cannabis"
- "Insufficient age verification mechanisms"
- "Content that encourages illegal activities"

### Was du brauchst

| Anforderung | Status |
|------------|--------|
| Apple Developer Account | ➡️ Mannuell beantragen |
| Company DUNS Number (falls GmbH/UG) | ➡️ Mannuell beantragen |
| Lizenznachweis (Apotheke/Club) | ➡️ Mannuell |
| Age verification | 🔲 Noch nicht implementiert |
| Medical vs. recreational positioning | 🔲 Entscheidung nötig |

### Strategie für iOS

**Option A — Medical App Positionierung:**
- App als "Medizinisches Cannabis-Tagebuch" positionieren
- Keine Community-Features (nur persönliche Sammlung)
- Explicitly für Patienten mit Rezept
- Höhere Chance auf Review-Genehmigung

**Option B — Web-Alternative (empfohlen):**
- PWA auf iOS-Bildschirm speicherbar (Safari → Add to Home Screen)
- Kein App-Store-Review nötig
- Alle Features verfügbar
- Funktioniert auf iOS wie eine native App

### Wenn du es trotzdem über den App Store versuchst:

1. Apple Developer Program beantragen (€99/Jahr)
2. DUNS-Nummer für Firma holen
3. **App-Name:** "GreenLog — Medical Strain Tracker" (nicht "CannaLog")
4. **Description:** Medizinisches Cannabis-Journal, keine Verkauf
5. **Support-URL:** HTTPS + Impressum
6. **Privacy Policy:** Erforderlich
7. **Age Rating:** 17+ (oder 18+)

---

## 🔐 Datenschutz & Rechtliches (Germany)

### Was du brauchst

| Dokument | URL | Status |
|----------|-----|--------|
| Datenschutzerklärung | `/datenschutz` | ✅ Vorhanden |
| Impressum | `/impressum` | ✅ Vorhanden |
| Cookie Consent | In-App Banner | ✅ Vorhanden |
| Nutzungsbedingungen | `/agb` | ✅ Vorhanden |
| Löschkonzept (DSGVO) | — | ⚠️ Prüfen |
| Age Verification | — | 🔲 Fehlt |

### Empfehlungen

1. **Altersverifikation** vor Registration einbauen (18+ Checkbox reicht für Germany)
2. **Löschfunktion** für Account + Daten (DSGVO Art. 17)
3. **Cookie-Banner** optimieren ( Analytics + Marketing Cookies trennen)
4. **Auftragsverarbeitung** prüfen falls Supabase als Auftragsverarbeiter fungiert

---

## 📊 Push Notifications — Setup

### VAPID Keys generieren (einmalig)

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog

# VAPID Keys generieren
npx web-push generate-vapid-keys
```

Ausgabe:
```
==========================================
Public Key:
BCh6V8K7HRnQb7G2F3x9P8K4L5M6N7O8P9Q...

Private Key:
RF3x9P8K4L5M6N7O8P9Q0R1S2T3U4V5...
==========================================
```

### In Vercel eintragen

1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. `VAPID_PUBLIC_KEY` = Public Key
3. `VAPID_PRIVATE_KEY` = Private Key (NIEMALS in .env.local committen!)
4. `NEXT_PUBLIC_SITE_URL` = https://greenlog.app
5. Redeploy

### Lokal testen

```bash
# .env.local hinzufügen
echo "VAPID_PUBLIC_KEY=BCh6V8K7HR..." >> .env.local
echo "VAPID_PRIVATE_KEY=RF3x9P8K4..." >> .env.local

# Dev Server starten
npm run dev
```

### Push manuell testen

1. App öffnen → Login
2. DevTools → Application → Service Workers → `sw.js` → Messages senden
3. Oder: Notification Permission erteilen + Button in Notification Panel klicken

---

## 📦 Deployment-Checkliste

- [ ] `npm run build` → kein Fehler
- [ ] Vercel Deployment erfolgreich
- [ ] HTTPS aktiv (automatic bei Vercel)
- [ ] Deep Link Dateien mit echten IDs
- [ ] VAPID Keys in Vercel Env Variables
- [ ] `.well-known/assetlinks.json` deployed
- [ ] `.well-known/apple-app-site-association` deployed
- [ ] Datenschutzerklärung + Impressum online + erreichbar
- [ ] Supabase Migration `20260401090000` zu prod gestreamed

### Supabase Migration zu Production

```bash
# Lokal in /home/phhttps/Dokumente/Greenlog/GreenLog
supabase db push
```

Oder in der Supabase Dashboard → SQL Editor → die Migration SQL manuell ausführen.

---

## 🚀 Nächste Schritte (Priorität)

1. **JETZT:** Deep Link Dateien mit echten Team-IDs aktualisieren
2. **DIESE WOCHE:** VAPID Keys generieren + in Vercel eintragen
3. **DIESE WOCHE:** Android Play Store Produktseite vorbereiten
4. **NÄCHSTE WOCHE:** Play Store einreichen
5. **OFFEN:** Age Verification in der App
6. **LANGFRISTIG:** iOS App Store Review (falls gewünscht)
