# Onboarding Expansion Design

**Date:** 2026-04-03
**Status:** Approved
**Author:** Claude Code

## Overview

Erweitert das bestehende Onboarding um 2 neue Steps (Strain Compare, Organizations/Clubs), aktualisiert einen bestehenden Step (Filter Presets in World Collection), und fügt einen Test-Button in den Profileinstellungen hinzu.

## Changes

### 1. Onboarding Steps erweitern

**Datei:** `src/components/onboarding/onboarding-guide.tsx`

**Neue Steps (9 statt 7):**

| # | Titel | Icon | Farbe | Pfad |
|---|-------|------|-------|------|
| 1 | Willkommen bei CannaLog | Logo | #00F5FF | `/` |
| 2 | Social & Community | Users | #2FF801 | `/discover` |
| 3 | World Collection | Globe | #fbbf24 | `/strains` |
| 4 | Label Scanner | Camera | #00F5FF | `/scanner` |
| 5 | **Vergleiche Sorten** | **Scale** | **#00F5FF** | **`/strains/compare`** |
| 6 | Deine Sammlung | BookMarked | #A3E4D7 | `/collection` |
| 7 | Dein Profil & Badges | UserIcon | #2FF801 | `/profile` |
| 8 | **Dein Club / Deine Apotheke** | **Building** | **#2FF801** | **`/discover`** |
| 9 | (Finish) | - | - | navigiert zu `/` |

**Step 3 Update (World Collection):**
- Bestehende Description um Filter Presets ergänzen:
  ```tsx
  description: "Die globale Datenbank. Nutze Filter Presets für schnelle Suche nach Sorten und füge sie deiner Sammlung hinzu. Eigene Sorten können auch erstellt werden.",
  ```

**Neuer Step 5 (Strain Compare):**
```tsx
{
    title: "Vergleiche Sorten",
    description: "Rechtsklick auf jede Sorte für Side-by-Side Vergleich. Bis zu 3 Sorten gleichzeitig analysieren – perfekt um die richtige Sorte zu finden.",
    icon: <Scale size={48} />,
    color: "#00F5FF",
    path: "/strains/compare"
}
```

**Neuer Step 8 (Organizations/Clubs):**
```tsx
{
    title: "Dein Club / Deine Apotheke",
    description: "Erstelle oder trete Organizationen bei. Ideal für Clubs und Apotheken – teilt eure Sorten und Erfahrungen im Team.",
    icon: <Building size={48} />,
    color: "#2FF801",
    path: "/discover"
}
```

**Icon Import hinzufügen:**
```tsx
import { Scale, Building } from "lucide-react";
```

### 2. Test-Button in Profileinstellungen

**Datei:** `src/app/profile/settings/page.tsx`

**Neue Sektion zwischen "Passwort" und "Datenschutz":**

```tsx
<section className="space-y-4">
  <div className="flex items-center gap-2 px-1">
    <Sparkles size={16} className="text-[#00F5FF]" />
    <h2 className="text-xs font-black uppercase tracking-widest">Onboarding</h2>
  </div>

  <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-6 rounded-[2rem] space-y-4">
    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
      Dein Onboarding wurde bereits abgeschlossen.
    </p>
    <Button
      onClick={handleResetOnboarding}
      className="w-full h-12 bg-[#00F5FF] text-black font-black uppercase tracking-widest rounded-xl"
    >
      <Sparkles size={16} className="mr-2" />
      Onboarding erneut starten
    </Button>
  </Card>
</section>
```

**Handler:**
```tsx
const handleResetOnboarding = async () => {
    // 1. localStorage zurücksetzen
    localStorage.removeItem("cannalog_onboarding_completed");

    // 2. DB zurücksetzen (für eingeloggte User)
    if (user && !isDemoMode) {
        await supabase
            .from("profiles")
            .update({ has_completed_onboarding: false })
            .eq("id", user.id);
    }

    // 3. Onboarding anzeigen
    setIsOnboardingVisible(true);

    // 4. Kurze Bestätigung
    setOnboardingResetStatus({ type: "success", msg: "Onboarding wurde zurückgesetzt." });
};
```

**State:**
```tsx
const [onboardingResetStatus, setOnboardingResetStatus] = useState<{ type: "success" | "error", msg: string } | null>(null);
```

**Bedingung:** Button nur rendern wenn `has_completed_onboarding === true` (aus dem Profil-Datenfetch).

## Component Changes

### OnboardingGuide

- `ONBOARDING_STEPS` Array: 7 → 9 Einträge
- Zwei neue `lucide-react` Icons: `Scale`, `Building`
- Step-Logik bleibt gleich (Navigation via router.push)

### Settings Page

- Neuer Import: `Sparkles` von lucide-react
- Neue State-Variable für Reset-Status
- Neue Sektion mit bedingtem Rendering
- `handleResetOnboarding` Funktion

## Dependencies

- Keine neuen Dependencies (Scale und Building sind in lucide-react bereits vorhanden)

## Files Modified

| File | Change |
|------|--------|
| `src/components/onboarding/onboarding-guide.tsx` | 2 neue Steps, 2 neue Icons |
| `src/app/profile/settings/page.tsx` | Test-Button Sektion |

## Notes

- Demo-Modus: Der Test-Button ist auch im Demo-Modus funktional (zum Testen des Flows)
- Die Sortierung der Steps bringt Compare zwischen Scanner und Collection – logischer Platz wenn User gerade Sorten browsen
- Organizations Step kommt nach Profil, da es ein "fortgeschrittenes" Feature ist – nach der persönlichen Nutzung
