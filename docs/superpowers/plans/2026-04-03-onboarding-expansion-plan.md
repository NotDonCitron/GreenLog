# Onboarding Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 2 new steps to the OnboardingGuide (Strain Compare, Organizations/Clubs), update World Collection step description to mention Filter Presets, add Scale and Building icons, and add a test-reset button in profile settings.

**Architecture:** Extend the existing `ONBOARDING_STEPS` array in `OnboardingGuide` with 2 new entries. Add new Sektion in profile settings page with a reset handler that clears onboarding state and re-triggers the guide.

**Tech Stack:** Next.js (Pages Router), TypeScript, Tailwind CSS, lucide-react, Supabase

---

## File Map

| File | Change |
|------|--------|
| `src/components/onboarding/onboarding-guide.tsx` | Add 2 steps + icons |
| `src/app/profile/settings/page.tsx` | Add test button section |

---

## Tasks

### Task 1: Update OnboardingGuide imports and steps

**Files:**
- Modify: `src/components/onboarding/onboarding-guide.tsx`

- [ ] **Step 1: Read the current onboarding-guide.tsx**

Read `src/components/onboarding/onboarding-guide.tsx` lines 1-70 to see the current `ONBOARDING_STEPS` array and imports.

- [ ] **Step 2: Add Scale and Building icons to imports**

Find this line:
```tsx
import { 
    ChevronRight, 
    ChevronLeft, 
    Sparkles, 
    Users, 
    Globe, 
    User as UserIcon, 
    Camera,
    BookMarked
} from "lucide-react";
```

Add `Scale` and `Building`:
```tsx
import { 
    ChevronRight, 
    ChevronLeft, 
    Sparkles, 
    Users, 
    Globe, 
    User as UserIcon, 
    Camera,
    BookMarked,
    Scale,
    Building
} from "lucide-react";
```

- [ ] **Step 3: Update World Collection step description**

Find the World Collection step in `ONBOARDING_STEPS` (around line 43-48) and change the `description` field:

**Before:**
```tsx
{
    title: "World Collection",
    description: "Die globale Datenbank. Suche nach Sorten und füge sie deiner Sammlung hinzu. Falls du deine Sorte nicht findest, kannst du auch eigene Strains erstellen.",
    icon: <Globe size={48} />,
    color: "#fbbf24",
    path: "/strains"
},
```

**After:**
```tsx
{
    title: "World Collection",
    description: "Die globale Datenbank. Nutze Filter Presets für schnelle Suche nach Sorten und füge sie deiner Sammlung hinzu. Eigene Sorten können auch erstellt werden.",
    icon: <Globe size={48} />,
    color: "#fbbf24",
    path: "/strains"
},
```

- [ ] **Step 4: Add Strain Compare step (after Scanner, as step 5)**

Find the Scanner step in `ONBOARDING_STEPS` and add the new Compare step right after it. The Scanner step ends around line 54-55. Insert after `path: "/scanner"` and before the Sammlung step.

**Insert this after Scanner step:**
```tsx
    {
        title: "Vergleiche Sorten",
        description: "Rechtsklick auf jede Sorte für Side-by-Side Vergleich. Bis zu 3 Sorten gleichzeitig analysieren – perfekt um die richtige Sorte zu finden.",
        icon: <Scale size={48} />,
        color: "#00F5FF",
        path: "/strains/compare"
    },
```

- [ ] **Step 5: Add Organizations/Clubs step (after Profil, as step 8)**

Find the Profil & Badges step and add the new Organizations step after it (before the closing of the array).

**Insert this after Profil step:**
```tsx
    {
        title: "Dein Club / Deine Apotheke",
        description: "Erstelle oder trete Organizationen bei. Ideal für Clubs und Apotheken – teilt eure Sorten und Erfahrungen im Team.",
        icon: <Building size={48} />,
        color: "#2FF801",
        path: "/discover"
    },
```

- [ ] **Step 6: Commit**

```bash
git add src/components/onboarding/onboarding-guide.tsx
git commit -m "$(cat <<'EOF'
feat: add Strain Compare and Organizations steps to Onboarding

- Add Scale icon for Compare step
- Add Building icon for Organizations step
- Update World Collection description to mention Filter Presets
- Insert Compare step after Scanner (step 5)
- Insert Organizations step after Profil (step 8)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Add test-reset button in profile settings

**Files:**
- Modify: `src/app/profile/settings/page.tsx`

- [ ] **Step 1: Read the current profile settings page**

Read `src/app/profile/settings/page.tsx` to understand the structure, existing imports, and where to add the new section.

- [ ] **Step 2: Add Sparkles import**

Find the existing lucide imports (around line 18):
```tsx
import {
  ChevronLeft,
  Mail,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Lock,
  UserRound,
  Download,
  Shield
} from "lucide-react";
```

Add `Sparkles`:
```tsx
import {
  ChevronLeft,
  Mail,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Lock,
  UserRound,
  Download,
  Shield,
  Sparkles
} from "lucide-react";
```

- [ ] **Step 3: Add state for onboarding reset**

Find the state declarations (around line 115) and add after `exportStatus`:
```tsx
const [onboardingResetStatus, setOnboardingResetStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
```

- [ ] **Step 4: Add handler function**

Find the `handleExportData` function (around line 207) and add the new handler after it:
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

    // 3. Kurze Bestätigung
    setOnboardingResetStatus({ type: "success", msg: "Onboarding wurde zurückgesetzt. Es erscheint beim nächsten Seitenbesuch." });

    // 4. Auto-hide status after 3s
    setTimeout(() => setOnboardingResetStatus(null), 3000);
};
```

- [ ] **Step 5: Add section in the settings page**

Find the section structure. Add a new section between the "Passwort ändern" section (around line 400) and the "Datenschutz & Consent" section (around line 402).

**Insert this before the Datenschutz section:**
```tsx
        {/* Onboarding Test */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Sparkles size={16} className="text-[#00F5FF]" />
            <h2 className="text-xs font-black uppercase tracking-widest">Onboarding</h2>
          </div>

          <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-6 rounded-[2rem] space-y-4">
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Dein Onboarding wurde bereits abgeschlossen.
            </p>

            {onboardingResetStatus && (
              <div className={`p-3 rounded-xl flex items-start gap-2 text-xs font-bold border ${
                onboardingResetStatus.type === 'success' ? 'bg-[#2FF801]/10 border-[#2FF801]/20 text-[#2FF801]' : 'bg-[#ff716c]/10 border-[#ff716c]/20 text-[#ff716c]'
              }`}>
                <span>{onboardingResetStatus.msg}</span>
              </div>
            )}

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

- [ ] **Step 6: Commit**

```bash
git add src/app/profile/settings/page.tsx
git commit -m "$(cat <<'EOF'
feat: add onboarding reset button to profile settings

- Add Sparkles icon import
- Add onboardingResetStatus state
- Add handleResetOnboarding handler
- Add new Onboarding section with reset button
- Button clears localStorage and DB flag, shows confirmation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Verification

After completing all tasks:

1. **Onboarding shows 9 steps** — Start a new session or clear localStorage, verify the onboarding guide appears with 9 dots in the progress bar
2. **Step 5 is "Vergleiche Sorten"** — Navigate through onboarding, step 5 should be the Compare step with Scale icon
3. **Step 8 is "Dein Club / Deine Apotheke"** — Navigate through onboarding, step 8 should be the Organizations step with Building icon
4. **Filter Presets mentioned in World Collection** — Step 3 should mention Filter Presets
5. **Test button in profile settings** — Visit `/profile/settings`, scroll to Onboarding section, click the button, verify status message appears
6. **Onboarding resets properly** — After clicking reset, refresh the page, the onboarding guide should appear again

---

## Spec Coverage

| Spec Requirement | Task |
|-----------------|------|
| Add Strain Compare step (Step 5) | Task 1, Step 4 |
| Add Organizations/Clubs step (Step 8) | Task 1, Step 5 |
| Update World Collection with Filter Presets mention | Task 1, Step 3 |
| Add Scale and Building icons | Task 1, Step 2 |
| Test button in profile settings | Task 2 |
| Reset handler clears localStorage + DB | Task 2, Step 4 |
