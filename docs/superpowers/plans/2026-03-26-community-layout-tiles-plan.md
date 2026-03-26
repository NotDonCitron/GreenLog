# APP-1048: Community Layout & Tiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Layout- und Kachel-Anpassungen für die eigene Community-Ansicht (Admin/Gründer) umsetzen.

**Architecture:** Die Community-Detailseite wird in drei Zonen aufgeteilt: (1) Header mit Name + Follow-Button, (2) Stats-Card, (3) neue Kachel-Sektion mit drei Aktions-Kacheln. Ein neues `InviteAdminModal` ermöglicht das Einladen von Admins.

**Tech Stack:** Next.js App Router, Tailwind, Lucide Icons, Supabase

---

## File Map

| Datei | Verantwortung |
|-------|---------------|
| `src/app/community/[id]/page.tsx` | Header-Layout, Kachel-Sektion, Zustand |
| `src/components/community/invite-admin-modal.tsx` | **NEU** — Modal für Admin-Einladung |

---

## Task 1: Community Detail Page Header umbauen

**Files:**
- Modify: `src/app/community/[id]/page.tsx:150-182`

**Context:** Aktuell ist der Header strukturiert als `[Name+Label links] [Aktionen rechts]`. Die Aktionen (Plus, Settings, Follow) sollen aufgeteilt werden: Follow direkt unter den Namen, Plus/Settings werden Kacheln.

- [ ] **Step 1: "Deine Community"-Label bedingt entfernen**

Ersetze in Zeile 152-154:
```tsx
<p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">
  Deine Community
</p>
```

Mit:
```tsx
{/* Label removed for admin view per APP-1048 */}
```

- [ ] **Step 2: Follow-Button unter Community-Namen verschieben**

Die aktuelle Struktur (Zeilen 150-182):
```tsx
<div className="flex items-start justify-between gap-4">
  <div>
    <p className="text-[10px]...">Deine Community</p>
    <h1>...</h1>
    <OrgTypeLabel ... />
  </div>
  <div className="flex items-center gap-2">
    {user && isAdminOrGründer && <CreateStrainModal ... />}
    {user && isAdminOrGründer && <Link href="/settings/organization">...</Link>}
    <FollowButton organizationId={organizationId} />
  </div>
</div>
```

Neue Struktur:
```tsx
<div>
  <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
    {organization.name}
  </h1>
  <OrgTypeLabel type={organization.organization_type} />
  <div className="mt-2">
    <FollowButton organizationId={organizationId} />
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/community/[id]/page.tsx
git commit -m "feat(community): refactor header layout for admin view (APP-1048)"
```

---

## Task 2: Kachel-Sektion erstellen

**Files:**
- Modify: `src/app/community/[id]/page.tsx` (nach Stats, vor Feed)

**Context:** Zwischen Stats und Activity Feed werden drei Kacheln eingefügt. Design orientiert sich an bestehenden Card-Komponenten im Projekt.

- [ ] **Step 1: Bestehende CreateStrainModal-Import und Plus/Settings-Aktionen aus Header entfernen**

Entferne aus dem Header (war in `flex items-center gap-2`):
```tsx
{user && isAdminOrGründer && (
  <CreateStrainModal
    organizationId={organizationId}
    trigger={
      <button className="w-10 h-10 rounded-full bg-[#2FF801]/20 border border-[#2FF801]/40 flex items-center justify-center text-[#2FF801] hover:bg-[#2FF801]/30 transition-colors">
        <Plus size={18} />
      </button>
    }
    onSuccess={() => setRefreshKey((k) => k + 1)}
  />
)}
{user && isAdminOrGründer && (
  <Link
    href="/settings/organization"
    className="w-10 h-10 rounded-full bg-black/10 border border-black/20 flex items-center justify-center text-black/60 hover:text-black hover:bg-black/20 transition-colors"
  >
    <Settings size={16} />
  </Link>
)}
```

- [ ] **Step 2: Kachel-Sektion zwischen Stats und Feed einfügen**

Nach `</div> {/* end px-8 mt-4 stats */}` und vor `/* Feed */`:

```tsx
{user && isAdminOrGründer && (
  <div className="px-8 mt-6">
    <div className="grid grid-cols-3 gap-3">
      {/* Strains hinzufügen */}
      <CreateStrainModal
        organizationId={organizationId}
        trigger={
          <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#2FF801]/10 border border-[#2FF801]/30 hover:bg-[#2FF801]/20 transition-colors min-h-[100px]">
            <div className="w-10 h-10 rounded-full bg-[#2FF801]/20 flex items-center justify-center">
              <Plus size={18} className="text-[#2FF801]" />
            </div>
            <span className="text-xs font-bold text-[#2FF801]">Strains</span>
          </button>
        }
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      {/* Admin anlegen */}
      <button
        onClick={() => setShowInviteAdmin(true)}
        className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#00F5FF]/10 border border-[#00F5FF]/30 hover:bg-[#00F5FF]/20 transition-colors min-h-[100px]"
      >
        <div className="w-10 h-10 rounded-full bg-[#00F5FF]/20 flex items-center justify-center">
          <Users size={18} className="text-[#00F5FF]" />
        </div>
        <span className="text-xs font-bold text-[#00F5FF]">Admin</span>
      </button>

      {/* Einstellungen */}
      <Link
        href="/settings/organization"
        className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-black/5 border border-black/20 hover:bg-black/10 transition-colors min-h-[100px]"
      >
        <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center">
          <Settings size={18} className="text-black/60" />
        </div>
        <span className="text-xs font-bold text-black/60">Einstellungen</span>
      </Link>
    </div>
  </div>
)}
```

- [ ] **Step 3: `useState` für `showInviteAdmin` hinzufügen**

In der Component, nach den anderen `useState` calls:
```tsx
const [showInviteAdmin, setShowInviteAdmin] = useState(false);
```

- [ ] **Step 4: `InviteAdminModal` importieren und einbinden**

Import hinzufügen:
```tsx
import { InviteAdminModal } from "@/components/community/invite-admin-modal";
```

Vor `<BottomNav />`:
```tsx
{showInviteAdmin && (
  <InviteAdminModal
    organizationId={organizationId}
    onClose={() => setShowInviteAdmin(false)}
    onSuccess={() => {
      setShowInviteAdmin(false);
      setRefreshKey((k) => k + 1);
    }}
  />
)}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/community/[id]/page.tsx
git commit -m "feat(community): add tile section with 3 action tiles (APP-1048)"
```

---

## Task 3: InviteAdminModal Komponente erstellen

**Files:**
- Create: `src/components/community/invite-admin-modal.tsx`

**Context:** Neues Modal zum Einladen von Admin-Nutzern. Orientiert sich am bestehenden `CreateStrainModal` Pattern.

- [ ] **Step 1: Modal-Komponente erstellen**

```tsx
"use client";

import { useState } from "react";
import { X, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface InviteAdminModalProps {
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteAdminModal({ organizationId, onClose, onSuccess }: InviteAdminModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: inviteError } = await supabase
        .from("organization_invites")
        .insert({
          organization_id: organizationId,
          email: email.trim().toLowerCase(),
          role: "admin",
        })
        .select()
        .single();

      if (inviteError) {
        setError(inviteError.message);
        return;
      }

      onSuccess();
    } catch (err) {
      setError("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/60"
        >
          <X size={16} />
        </button>

        <h2 className="text-xl font-black italic tracking-tighter mb-6">
          Admin einladen
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-black/60 mb-2">
              E-Mail Adresse
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-black/20 focus:border-[#00F5FF] focus:outline-none focus:ring-2 focus:ring-[#00F5FF]/20 transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#00F5FF] text-black font-bold hover:bg-[#00F5FF]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <UserPlus size={18} />
            )}
            Einladung senden
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/community/invite-admin-modal.tsx
git commit -m "feat(community): add InviteAdminModal component (APP-1048)"
```

---

## Self-Review Checklist

- [ ] **Spec coverage**: Alle 5 Akzeptanzkriterien aus dem Design-Spec sind durch Tasks abgedeckt
- [ ] **Placeholder scan**: Keine TBD, TODO oder vagen Stellen
- [ ] **Type consistency**: `organizationId` wird konsistent als `string` verwendet, `onClose`/`onSuccess` sind konsistent

---

## Ausstehende Entscheidung

Bevor die Kachel "Admin anlegen" funktioniert, muss geklärt werden, ob die Tabelle `organization_invites` existiert und die richtige Struktur hat. Falls nicht, muss ggf. eine Migration erstellt werden (Separate Aufgabe / separates Ticket).

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
