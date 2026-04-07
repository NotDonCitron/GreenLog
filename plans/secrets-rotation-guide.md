# Secrets Rotation – CannaLOG

> **WICHTIG:** Diese Anleitung muss MANUELL ausgeführt werden. Nicht automatisieren.
> **Datum:** 2026-04-04
> **Grund:** `.env.local` enthielt Live-Produktionsgeheimnisse im Klartext

---

## Vor dem Rotieren

1. Stelle sicher, dass du Zugriff auf alle folgenden Dienste hast
2. Erstelle einen Backup-Zeitpunkt – rotiere alle Keys innerhalb von 30 Minuten
3. Aktualisiere `.env.local` UND Vercel Dashboard (.env Variables)

---

## 1. Supabase Service Role Key

**Wo:** [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API → `service_role` key

1. Gehe zu Supabase Dashboard
2. Wähle dein Projekt
3. Settings → API
4. Klicke auf "Rotate" beim `service_role` key (nicht `anon`!)
5. Kopiere den neuen Key
6. Aktualisiere:
   - `.env.local`: `SUPABASE_SERVICE_ROLE_KEY=<neuer-key>`
   - Vercel Dashboard → Settings → Environment Variables → `SUPABASE_SERVICE_ROLE_KEY`

**⚠️ ACHTUNG:** Der alte Key funktioniert sofort nach dem Rotieren nicht mehr. Downtime vermeiden: erst neuen Key setzen, dann alten rotieren.

---

## 2. GitHub Token

**Wo:** [GitHub Settings](https://github.com/settings/tokens)

1. Gehe zu GitHub → Settings → Developer Settings → Personal Access Tokens
2. Finde den Token der mit `ghp_` beginnt
3. Lösche den alten Token
4. Erstelle einen neuen Token mit den gleichen Scopes (repo, workflow)
5. Aktualisiere:
   - `.env.local`: `GITHUB_TOKEN=<neuer-token>`
   - Vercel Dashboard → `GITHUB_TOKEN`

---

## 3. MiniMax API Key

**Wo:** [MiniMax Platform](https://platform.minimax.io/)

1. Gehe zu MiniMax Dashboard → API Keys
2. Revoke den alten Key (`sk-api-...`)
3. Erstelle einen neuen Key
4. Aktualisiere:
   - `.env.local`: `MINIMAX_API_KEY=<neuer-key>`
   - Vercel Dashboard → `MINIMAX_API_KEY`

---

## 4. VAPID Keys (Push Notifications)

**Wo:** Lokal generieren

```bash
npx web-push generate-vapid-keys
```

Ausgabe:
```
Public Key: <public-key>
Private Key: <private-key>
```

Aktualisiere:
- `.env.local`:
  ```
  VAPID_PUBLIC_KEY=<public-key>
  VAPID_PRIVATE_KEY=<private-key>
  ```
- Vercel Dashboard → `VAPID_PUBLIC_KEY` und `VAPID_PRIVATE_KEY`

**⚠️ WICHTIG:** Nach dem Rotieren müssen alle bestehenden Push-Subscriptions der Nutzer neu registriert werden. Die alten Subscriptions funktionieren nicht mehr.

---

## 5. Firecrawl API Key

**Wo:** [Firecrawl Dashboard](https://www.firecrawl.dev/)

1. Gehe zu Firecrawl Dashboard → API Keys
2. Revoke den alten Key (`fc-...`)
3. Erstelle einen neuen Key
4. Aktualisiere:
   - `.env.local`: `FIRECRAWL_API_KEY=<neuer-key>`
   - Vercel Dashboard → `FIRECRAWL_API_KEY`

---

## 6. Upstash Redis (falls noch nicht eingerichtet)

**Wo:** [Upstash Console](https://console.upstash.com/)

1. Gehe zu Upstash Console → Database
2. Kopiere `UPSTASH_REDIS_REST_URL` und `UPSTASH_REDIS_REST_TOKEN`
3. Aktualisiere:
   - `.env.local`:
     ```
     UPSTASH_REDIS_REST_URL=<url>
     UPSTASH_REDIS_REST_TOKEN=<token>
     ```
   - Vercel Dashboard → beide Variables

---

## 7. Sentry Auth Token

**Wo:** [Sentry Settings](https://sentry.io/settings/account/api/auth-tokens/)

1. Gehe zu Sentry → Account Settings → API Keys
2. Lösche den alten Auth Token
3. Erstelle einen neuen mit Scopes: `project:write, org:read, event:admin`
4. Aktualisiere:
   - `.env.local`: `SENTRY_AUTH_TOKEN=<neuer-token>`
   - Vercel Dashboard → `SENTRY_AUTH_TOKEN`

---

## Nach dem Rotieren

1. **Deploy:** `vercel --prod` um die neuen Environment Variables zu aktivieren
2. **Testen:**
   - Login/Logout funktioniert
   - Strain-Daten laden
   - Push Notifications funktionieren (nach VAPID-Rotation)
   - Sentry Events werden gesendet
3. **Überprüfen:** `grep -r "ghp_\|sk-api-\|fc-\|sb_" . --include="*.ts" --include="*.js" --include="*.json"` – sollte keine Secrets finden
4. **git history prüfen:** `git log --all --full-history -- ".env*"` – falls `.env.local` je commited wurde, muss die History bereinigt werden (`git filter-repo` oder `bfg`)

---

## .env.local Sicherheit

Stelle sicher, dass folgende Einträge in `.gitignore` stehen:

```
.env.local
.env*.local
```

Und dass `.env.example` nur Platzhalter enthält:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```
