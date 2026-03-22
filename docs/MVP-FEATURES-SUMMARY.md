# Cannalog MVP Core Features - Zusammenfassung

## Übersicht

Dieses Dokument fasst die 5 Kern-Features für das Cannalog MVP zusammen und zeigt den aktuellen Implementierungsstatus.

---

## 1. Strain-Datenbank (The Single Source of Truth)

### Anforderungen
- **Datenquelle:** Bestehende API (z.B. Oleaf) oder statisches JSON-File mit Top 200 Strains
- **Datenmodell:**
  - `strain_id` (UUID) ✅
  - `name` (String) ✅
  - `type` (Enum: Indica, Sativa, Hybrid, Ruderalis) ⚠️ (Ruderalis fehlt)
  - `avg_thc_percent` / `avg_cbd_percent` (Float) ❌ (aktuell: thc_min/max, cbd_min/max)
  - `terpenes` (Array of Objects: [{name, percent}]) ❌ (aktuell: TEXT[])
  - `description` (Text) ✅
  - `image_url` (String - Standardbild) ✅

### Status: ⚠️ TEILWEISE IMPLEMENTIERT
- ✅ Grundlegende Tabelle existiert
- ❌ Terpenes-Struktur muss angepasst werden (Object-Array statt String-Array)
- ❌ THC/CBD-Felder müssen vereinheitlicht werden (avg statt min/max)
- ❌ Ruderalis-Typ fehlt

---

## 2. My Collection (Das Herzstück / Tasting Journal)

### Anforderungen
- User können eigene Bilder hochladen (1 Bild pro Eintrag für MVP)
- "Optimal Charge" als Freitextfeld
- **Datenmodell (User_Collection):**
  - `collection_id` (UUID) ❌
  - `user_id` (UUID) ❌
  - `strain_id` (UUID) ❌
  - `date_added` (Timestamp) ❌
  - `user_thc_percent` / `user_cbd_percent` (Float) ❌
  - `batch_info` (String - Freitext) ❌
  - `rating_taste` (Int 1-5 oder 1-10) ❌
  - `rating_effect` (Int 1-5 oder 1-10) ❌
  - `rating_overall` (Int 1-5 oder 1-10) ❌
  - `user_notes` (Text) ❌
  - `user_image_url` (String) ❌

### Status: ❌ NICHT IMPLEMENTIERT
- Aktuell wird die `ratings`-Tabelle verwendet
- Es fehlt eine dedizierte `user_collection`-Tabelle
- User-spezifische Daten (THC/CBD, Batch-Info, Notizen, Bilder) fehlen komplett

---

## 3. Favorites (Top 5) & Wishlist

### Anforderungen
- Beides sind Verknüpfungen zwischen User und Strain
- "Top 5" Restriktion ist Frontend-Logik
- Backend muss max. 5 Strains mit Rank > 0 validieren
- **Datenmodell-Anpassungen (User_Strain_Relations):**
  - `is_wishlisted` (Boolean) ❌
  - `is_favorite` (Boolean) ❌
  - `favorite_rank` (Int 1-5) ❌

### Status: ❌ NICHT IMPLEMENTIERT
- Keine Tabelle für User-Strain-Relationen
- Keine Wishlist-Funktionalität
- Keine Favorites-Funktionalität
- Heart-Button in UI vorhanden, aber ohne Funktion

---

## 4. Public / Private Mode

### Anforderungen
- **Rechtliche Sicherheit:** Public Mode zeigt NIEMALS aktuellen Lagerbestand
- Zeigt nur: "Hat diesen Strain probiert/bewertet"
- **Datenmodell:**
  - `profile_visibility` (Enum: 'public', 'private') ❌
  - Default: 'private' (Privacy by Design) ❌
- **Logik:**
  - Bei `profile_visibility == 'public'`: API liefert nur Username + Badges
  - Sensible Daten (user_notes, batch_info) bleiben immer privat ❌

### Status: ❌ NICHT IMPLEMENTIERT
- Kein `profile_visibility`-Feld in profiles-Tabelle
- Keine API-Logik für Public/Private-Modus
- Keine Unterscheidung zwischen öffentlichen und privaten Profildaten

---

## 5. Badges (Gamification-Engine)

### Anforderungen
- **MVP:** Keine komplexe Rules Engine, 5-10 simple Trigger hardcoden
- **Datenmodell:**
  - **Badges-Tabelle:**
    - `badge_id` ❌
    - `name` ❌
    - `icon_url` ❌
    - `description` ❌
  - **User_Badges-Tabelle:**
    - `user_id` ❌
    - `badge_id` ❌
    - `date_unlocked` ❌
- **MVP-Trigger:**
  1. Erster Strain in "My Collection" gespeichert → "Starter" Badge ❌
  2. 5 Strains bewertet → "Connoisseur" Badge ❌
  3. Strain mit >20% THC bewertet → "Highflyer" Badge ❌

### Status: ⚠️ TEILWEISE IMPLEMENTIERT
- ✅ Hardcoded Badges in Profile-Seite (First Bud, Hybrid Hunter, Sativa Soul, Night Owl)
- ❌ Keine dedizierte Badges-Tabelle
- ❌ Keine User_Badges-Tabelle
- ❌ Keine automatischen Trigger
- ❌ Keine persistente Badge-Vergabe

---

## Zusammenfassung: Was muss noch gemacht werden?

### 🔴 KRITISCH (MVP-Blocker)
1. **User_Collection-Tabelle** erstellen
2. **User_Strain_Relations-Tabelle** erstellen (für Favorites & Wishlist)
3. **Badges & User_Badges-Tabellen** erstellen
4. **profile_visibility** Feld zu profiles-Tabelle hinzufügen

### 🟡 WICHTIG (Feature-Vollständigkeit)
5. **Terpenes-Struktur** in strains-Tabelle anpassen (Object-Array)
6. **THC/CBD-Felder** vereinheitlichen (avg statt min/max)
7. **Badge-Trigger** implementieren (Event Listener)
8. **Public/Private API-Logik** implementieren

### 🟢 OPTIONAL (Verbesserungen)
9. **Ruderalis** zum strain type Enum hinzufügen
10. **Bild-Upload** für User-Collection implementieren
11. **Favorite-Rank-Validierung** im Backend (max 5)

---

## Nächste Schritte

1. **Datenbank-Migration** erstellen für neue Tabellen
2. **TypeScript-Types** aktualisieren
3. **API-Endpunkte** für Collection, Favorites, Badges erstellen
4. **Event Listener** für Badge-Trigger implementieren
5. **UI-Komponenten** für neue Features bauen

---

*Erstellt: 2026-03-22*
*Status: MVP-Planung*
