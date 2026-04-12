# Streak-System + Social Sharing Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement two independent features: (1) a streak system with daily-login counter and badge, and (2) KCanG-compliant social sharing cards for strain data.

**Architecture:**
- Streak: Stats bar on home/feed page showing counts + streak fire icon. Badge check uses existing `user_activities` table. Gap fix: write `strain_collected` activity entries to `user_activities`.
- Sharing: Extend existing Edge OG-image route with new query params. New ShareModal with custom WhatsApp/Telegram/Link-copy buttons. Toast after rating. Permanent share button near terpenes radar.

**Tech Stack:** Next.js Pages Router, Supabase, React Query, Tailwind CSS, Lucide icons, `next/og` ImageResponse

---

## Task 1: Fix — Write `user_activities` for Collection Events

**Files:**
- Modify: `src/hooks/useCollection.ts:101-119`
- Supabase: Either add database trigger OR modify the `collectMutation` to also insert into `user_activities`

**Rationale:** The `collectMutation` upserts to `user_collection` but never writes to `user_activities`. The `streak-7` badge criteria reads `user_activities`. Without this entry, the streak badge never triggers.

- [ ] **Step 1: Add `user_activities` insert into `collectMutation`**

In `src/hooks/useCollection.ts`, inside the `collectMutation.mutationFn`, after the successful `user_collection` upsert, add this Supabase insert:

```typescript
// Log collection activity for streak tracking
await supabase.from("user_activities").insert({
  user_id: user!.id,
  activity_type: "strain_collected",
  target_id: strainId,
  target_name: null, // resolved async if needed
  is_public: true,
})
```

The full `collectMutation` should look like:

```typescript
const collectMutation = useMutation({
  mutationFn: async ({ strainId, opts }: { strainId: string; opts?: CollectOptions }) => {
    const { error } = await supabase.from("user_collection").upsert({
      user_id: user!.id,
      strain_id: strainId,
      batch_info: opts?.batchInfo,
      user_notes: opts?.userNotes,
      user_thc_percent: opts?.userThc,
      user_cbd_percent: opts?.userCbd,
      user_image_url: opts?.userImageUrl,
      date_added: new Date().toISOString(),
    }, {
      onConflict: "user_id,strain_id",
    })
    if (error) throw error

    // Log to user_activities for streak tracking
    await supabase.from("user_activities").insert({
      user_id: user!.id,
      activity_type: "strain_collected",
      target_id: strainId,
      is_public: true,
    })
  },
  onError: sharedCallbacks.onError,
  onSettled: sharedCallbacks.onSettled,
})
```

- [ ] **Step 2: Run lint to verify no errors**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog && npm run lint -- --quiet 2>&1 | head -20
```

Expected: no errors (only warnings)

- [ ] **Step 3: Commit**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog && git add src/hooks/useCollection.ts && git commit -m "fix: log strain_collected to user_activities for streak tracking"
```

---

## Task 2: StatsBar Component with StreakCounter

**Files:**
- Create: `src/components/layout/stats-bar.tsx`
- Modify: `src/app/feed/page.tsx`

The `StatsBar` shows: `[StrainCount] Strains | [RatingCount] Bewertungen | [Streak]🔥 Streak`

- [ ] **Step 1: Create `src/components/layout/stats-bar.tsx`**

```typescript
"use client"

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"

async function fetchStreakCount(userId: string): Promise<number> {
  // Count distinct days with at least one activity in the last 30 days
  const { data } = await supabase
    .from("user_activities")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  if (!data) return 0

  // Group by day (YYYY-MM-DD) and count days
  const days = new Set(data.map((a) => a.created_at.split("T")[0]))
  return days.size
}

export function StatsBar() {
  const { user } = useAuth()

  const { data: strainCount = 0 } = useQuery({
    queryKey: ["collection-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("user_collection")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
      return count ?? 0
    },
    enabled: !!user,
  })

  const { data: ratingCount = 0 } = useQuery({
    queryKey: ["rating-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("ratings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
      return count ?? 0
    },
    enabled: !!user,
  })

  const { data: streak = 0 } = useQuery({
    queryKey: ["streak-count", user?.id],
    queryFn: () => fetchStreakCount(user!.id),
    enabled: !!user,
  })

  return (
    <div className="flex items-center justify-center gap-3 text-sm text-zinc-400 py-2 border-b border-white/5">
      <span>{strainCount} Strains</span>
      <span className="text-zinc-600">|</span>
      <span>{ratingCount} Bewertungen</span>
      <span className="text-zinc-600">|</span>
      <span className="text-orange-400">
        {streak}🔥 Streak
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Add `StatsBar` to the feed page**

In `src/app/feed/page.tsx`, find where the page content starts (after the header/navigation) and add `<StatsBar />` as the first element inside the scrollable content area. Read the file first to understand its structure.

```bash
head -30 /home/phhttps/Dokumente/Greenlog/GreenLog/src/app/feed/page.tsx
```

Then edit to add the import and placement.

- [ ] **Step 3: Run lint**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog && npm run lint -- --quiet 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/stats-bar.tsx src/app/feed/page.tsx && git commit -m "feat: add StatsBar with strain count, rating count, and streak counter"
```

---

## Task 3: Extend OG-Image Route for Strain Data

**Files:**
- Modify: `src/app/api/og/route.tsx`

The existing route only accepts `?title=`. Extend it to accept strain-specific params for the share card.

- [ ] **Step 1: Read the existing route**

The file was read in full above. It's 86 lines, Edge runtime, uses `ImageResponse` from `next/og`.

- [ ] **Step 2: Rewrite the route with full strain support**

Replace the entire file content with this extended version:

```typescript
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const mode = searchParams.get('mode') || 'default'  // 'default' | 'strain'
  const title = searchParams.get('title') || 'CannaLog'

  // Strain mode: light lab-report style
  if (mode === 'strain') {
    const name = searchParams.get('name') || 'Unbekannte Sorte'
    const genetics = searchParams.get('genetics') || ''
    const thc = searchParams.get('thc') || '—'
    const cbd = searchParams.get('cbd') || '—'
    const terpenes = searchParams.get('terpenes') || ''

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fafafa',
            padding: '60px 80px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Analytisches Profil
            </div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#16a34a' }}>
              greenlog.app
            </div>
          </div>

          {/* Strain Name */}
          <div style={{ fontSize: name.length > 20 ? '52px' : '64px', fontWeight: 800, color: '#18181b', letterSpacing: '-0.02em', marginBottom: '12px' }}>
            {name}
          </div>

          {/* Genetics */}
          {genetics && (
            <div style={{ fontSize: '20px', color: '#71717a', marginBottom: '40px' }}>
              {genetics}
            </div>
          )}

          {/* THC / CBD */}
          <div style={{ display: 'flex', gap: '48px', marginBottom: '48px' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>THC</div>
              <div style={{ fontSize: '40px', fontWeight: 700, color: '#16a34a' }}>{thc}</div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CBD</div>
              <div style={{ fontSize: '40px', fontWeight: 700, color: '#16a34a' }}>{cbd}</div>
            </div>
          </div>

          {/* Terpenes */}
          {terpenes && (
            <div>
              <div style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leit-Terpene</div>
              <div style={{ fontSize: '22px', color: '#3f3f46', fontWeight: 500 }}>{terpenes}</div>
            </div>
          )}

          {/* Footer */}
          <div style={{ position: 'absolute', bottom: '40px', right: '60px', fontSize: '16px', color: '#d4d4d8' }}>
            Quelle: GreenLog Datenbank
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  // Default dark mode (existing behavior)
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          backgroundColor: '#0a0a0f',
          backgroundImage: 'linear-gradient(to bottom right, #0a0a0f 0%, #111827 100%)',
          padding: '60px 80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
          <img
            src="https://greenlog.app/logo.png"
            width="100"
            height="100"
            alt="CannaLog Logo"
            style={{ objectFit: 'contain' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ fontSize: title.length > 20 ? '56px' : '72px', fontWeight: 700, color: '#22c55e', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {title}
          </div>
          <div style={{ fontSize: '28px', color: '#a1a1aa', marginTop: '16px', letterSpacing: '0.01em' }}>
            Strain Management
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: '40px', right: '60px', fontSize: '18px', color: '#52525b' }}>
          greenlog.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

- [ ] **Step 3: Test the new route locally**

Start the dev server and verify both modes work:

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog && npm run dev &
sleep 5
# Test default mode
curl -s "http://localhost:3000/api/og" | head -c 100
# Test strain mode
curl -s "http://localhost:3000/api/og?mode=strain&name=Gelato&genetics=Hybrid&thc=25%&cbd=0.2%&terpenes=Myrcen%2C%20Limonen" -o /tmp/strain-og.png
file /tmp/strain-og.png
```

Expected: default returns PNG, strain mode returns a light-themed PNG.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/og/route.tsx && git commit -m "feat(og): add strain mode for KCanG-compliant lab-report share cards"
```

---

## Task 4: ShareModal Component

**Files:**
- Create: `src/components/social/share-modal.tsx`

Custom modal with WhatsApp, Telegram, Link-Copy buttons. Opens via `open` prop + `onClose`. Uses fixed caption text.

- [ ] **Step 1: Create `src/components/social/share-modal.tsx`**

```typescript
"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Share2, Copy, Check } from "lucide-react"

type ShareModalProps = {
  open: boolean
  onClose: () => void
  strainName: string
  strainUrl: string
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://greenlog.app"

export function ShareModal({ open, onClose, strainName, strainUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = strainUrl.startsWith("http") ? strainUrl : `${BASE_URL}${strainUrl}`
  const caption = `Labor-Datenblatt für ${strainName}. Quelle: GreenLog Datenbank.`

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(caption + " " + shareUrl)}`
    window.open(url, "_blank")
    onClose()
  }

  const handleTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(caption)}`
    window.open(url, "_blank")
    onClose()
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${caption} ${shareUrl}`)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        onClose()
      }, 1500)
    } catch {
      // fallback: select text
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold">Labor-Datenblatt teilen</h2>
          </div>

          <p className="text-sm text-zinc-500">
            {caption}
          </p>

          <div className="flex flex-col gap-3 mt-2">
            {/* WhatsApp */}
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 hover:bg-green-100 transition-colors text-left"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" className="text-green-600">
                <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <div>
                <div className="font-medium text-zinc-800">WhatsApp</div>
                <div className="text-xs text-zinc-500">Private Nachricht</div>
              </div>
            </button>

            {/* Telegram */}
            <button
              onClick={handleTelegram}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors text-left"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" className="text-blue-500">
                <path fill="currentColor" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              <div>
                <div className="font-medium text-zinc-800">Telegram</div>
                <div className="text-xs text-zinc-500">Private Nachricht</div>
              </div>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5 text-zinc-500" />
              )}
              <div>
                <div className="font-medium text-zinc-800">{copied ? "Kopiert!" : "Link kopieren"}</div>
                <div className="text-xs text-zinc-500">{copied ? "In Zwischenablage" : "Für jede App"}</div>
              </div>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Check if Dialog component exists**

```bash
ls /home/phhttps/Dokumente/Greenlog/GreenLog/src/components/ui/dialog*
```

If not found, create a minimal Dialog using the shadcn pattern or use a simple custom modal div with portal. The existing codebase uses shadcn-style components — check what's available.

- [ ] **Step 3: Run lint**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog && npm run lint -- --quiet 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/components/social/share-modal.tsx && git commit -m "feat: add ShareModal with WhatsApp, Telegram, and link copy"
```

---

## Task 5: Toast + Share Button on Strain Detail Page

**Files:**
- Modify: Strain detail page (find where ratings are submitted)
- Create: `src/components/social/rating-share-toast.tsx` (toast notification)

This requires finding the rating submission flow. Look for the strain detail page client component.

- [ ] **Step 1: Find the strain detail page**

```bash
find /home/phhttps/Dokumente/Greenlog/GreenLog/src -name "*.tsx" | xargs grep -l "rating" | head -10
```

Look for where the star rating is submitted. The rating flow likely has a mutation that calls an API route.

- [ ] **Step 2: Read the relevant component**

Report back the file path and the rating submission logic so the next steps can be written accurately.

- [ ] **Step 3: Add Toast after rating success**

Based on the strain detail page structure, add a toast notification after successful rating submission:
> "Eintrag gespeichert. 📤 Labor-Datenblatt weiterleiten"

Use an existing toast implementation if present, or create a minimal inline toast component.

- [ ] **Step 4: Add Share button near terpenes radar**

Find where the terpenes radar is displayed and add a Share button (Share2 icon from Lucide) that opens the ShareModal.

- [ ] **Step 5: Commit**

```bash
git add [modified files] && git commit -m "feat: add share button near terpenes radar and toast after rating"
```

---

## Verification Checklist

After all tasks are complete, verify:

- [ ] Collection events write to `user_activities` (check Supabase dashboard after collecting a strain)
- [ ] StatsBar appears on feed page with correct counts
- [ ] Streak count shows correct value (needs 7+ days of activities for badge)
- [ ] OG image route works with `?mode=strain&name=...` params
- [ ] ShareModal opens from share button
- [ ] WhatsApp/Telegram/copy buttons work
- [ ] Toast appears after rating submission
- [ ] No console errors on any affected pages
