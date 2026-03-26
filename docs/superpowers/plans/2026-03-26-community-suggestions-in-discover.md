# Community-Vorschläge im "Entdecken"-Bereich — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Im "Entdecken"-Bereich der Social-Seite (`/feed/page.tsx`) werden neben User-Vorschlägen auch Community-Vorschläge in der horizontalen Stories-Sektion angezeigt.

**Architecture:** `SuggestedUsers`-Komponente erhält `showCommunities`-Prop. Bei `true` werden aktive Organizations geladen, denen der User noch nicht angehört, und als Community-Karten in der gleichen horizontalen Scroll-Sektion wie User-Vorschläge gerendert. Ein neuer API-Endpoint `POST /api/community/{id}/join` ermöglicht das Beitreten.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, Tailwind CSS

---

## Datei-Übersicht

**Zu ändern:**
- `src/components/social/suggested-users.tsx` — Community-Vorschläge hinzufügen
- `src/app/feed/page.tsx` — `showCommunities={true}` an SuggestedUsers übergeben

**Zu erstellen:**
- `src/app/api/community/[id]/join/route.ts` — Join-Endpoint

---

## Task 1: API-Endpoint für Community-Join

**Files:**
- Create: `src/app/api/community/[id]/join/route.ts`
- Test: manuell via Browser (keine Unit-Tests für API-Routes)

- [ ] **Step 1: Endpoint erstellen**

Erstelle `src/app/api/community/[id]/join/route.ts` mit folgendem Inhalt:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function decodeToken(token: string): string | null {
    try {
        const payload = token.split(".")[1];
        const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
        return decoded.sub || null;
    } catch {
        return null;
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authHeader = request.headers.get("Authorization");
        const accessToken = authHeader?.replace("Bearer ", "");

        if (!accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = decodeToken(accessToken);
        if (!userId) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        });

        const { id: organizationId } = await params;

        // Check if organization exists
        const { data: org, error: orgError } = await supabase
            .from("organizations")
            .select("id, status")
            .eq("id", organizationId)
            .single();

        if (orgError || !org) {
            return NextResponse.json({ error: "not_found" }, { status: 404 });
        }

        if (org.status !== "active") {
            return NextResponse.json({ error: "Organization not active" }, { status: 400 });
        }

        // Check if already a member
        const { data: existingMember } = await supabase
            .from("organization_members")
            .select("id, membership_status")
            .eq("organization_id", organizationId)
            .eq("user_id", userId)
            .single();

        if (existingMember && existingMember.membership_status === "active") {
            return NextResponse.json({ error: "already_member" }, { status: 400 });
        }

        // If invite exists with pending status, activate it; otherwise create new membership
        if (existingMember && existingMember.membership_status === "invited") {
            const { error: updateError } = await supabase
                .from("organization_members")
                .update({ membership_status: "active", joined_at: new Date().toISOString() })
                .eq("id", existingMember.id);

            if (updateError) {
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }
        } else if (!existingMember) {
            const { error: insertError } = await supabase
                .from("organization_members")
                .insert({
                    organization_id: organizationId,
                    user_id: userId,
                    role: "member",
                    membership_status: "active",
                    joined_at: new Date().toISOString()
                });

            if (insertError) {
                return NextResponse.json({ error: insertError.message }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Community join error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/community/[id]/join/route.ts
git commit -m "feat: add POST /api/community/{id}/join endpoint

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
"
```

---

## Task 2: `SuggestedUsers` um Community-Vorschläge erweitern

**Files:**
- Modify: `src/components/social/suggested-users.tsx`

- [ ] **Step 1: Interface für SuggestedCommunity hinzufügen**

Füge nach `SuggestedUser` ein neues Interface ein (nach Zeile 259):

```typescript
export interface SuggestedCommunity {
    id: string;
    name: string;
    organization_type: "club" | "pharmacy" | null;
    logo_url: string | null;
    is_member: boolean;
}
```

- [ ] **Step 2: Props erweitern**

Erweitere das `SuggestedUsersProps`-Interface (Zeile 11-16):

```typescript
interface SuggestedUsersProps {
    limit?: number;
    title?: string;
    showViewAll?: boolean;
    showCommunities?: boolean;  // NEU
    className?: string;
}
```

- [ ] **Step 3: Destructure `showCommunities` mit Default `false`**

Ändere die Destructure in der Funktionskomponente (Zeile 18-23):

```typescript
export function SuggestedUsers({
    limit = 8,
    title = "Suggested for you",
    showViewAll = true,
    showCommunities = false,  // NEU
    className = "",
}: SuggestedUsersProps) {
```

- [ ] **Step 4: State für Communities hinzufügen**

Füge nach `const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());` (ca. Zeile 28) hinzu:

```typescript
const [communities, setCommunities] = useState<SuggestedCommunity[]>([]);
const [joinedCommunityIds, setJoinedCommunityIds] = useState<Set<string>>(new Set());
```

- [ ] **Step 5: Join-Handler für Communities hinzufügen**

Füge nach `handleFollow` (ca. Zeile 56) eine neue Funktion ein:

```typescript
const handleJoinCommunity = async (communityId: string) => {
    if (!user) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        const endpoint = `/api/community/${communityId}/join`;
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(accessToken && { "Authorization": `Bearer ${accessToken}` })
            }
        });

        const result = await response.json();

        if (result.success) {
            setJoinedCommunityIds(prev => new Set([...prev, communityId]));
            window.location.reload();
        }
    } catch (err) {
        console.error("Join community failed:", err);
    }
};
```

- [ ] **Step 6: Community-Fetching in `fetchSuggestedUsers` ergänzen**

Füge am Ende der try-Block in `fetchSuggestedUsers` hinzu, direkt vor `setUsers(...)` (nach ca. Zeile 165):

```typescript
            // Fetch suggested communities (only if showCommunities is true)
            if (showCommunities) {
                // Get organizations user is already member of
                const { data: memberships } = await supabase
                    .from("organization_members")
                    .select("organization_id")
                    .eq("user_id", user.id)
                    .eq("membership_status", "active");

                const joinedOrgIds = memberships?.map((m: { organization_id: string }) => m.organization_id) ?? [];

                const { data: orgsData } = await supabase
                    .from("organizations")
                    .select("id, name, organization_type, logo_url")
                    .eq("status", "active")
                    .limit(limit * 3);

                const filteredOrgs = (orgsData ?? []).filter(
                    (org) => !joinedOrgIds.includes(org.id)
                );

                const suggested: SuggestedCommunity[] = filteredOrgs.slice(0, limit).map(org => ({
                    id: org.id,
                    name: org.name,
                    organization_type: org.organization_type as "club" | "pharmacy" | null,
                    logo_url: org.logo_url ?? null,
                    is_member: false,
                }));

                setCommunities(suggested);
                setJoinedCommunityIds(new Set(joinedOrgIds));
            }
```

- [ ] **Step 7: Community-Rendering in der horizontalen Scroll-Sektion**

Erweitere das Rendering in der `return`-Sektion. Finde die map-Schleife mit `users.map` (ca. Zeile 196) und füge direkt danach eine map für Communities ein. Die Struktur sollte so aussehen:

```tsx
            {/* Users */}
            {users.map((suggestedUser) => (
                <div
                    key={`user-${suggestedUser.id}`}
                    className="flex-shrink-0 w-28 text-center"
                >
                    {/* ... bestehender User-Code ... */}
                </div>
            ))}

            {/* Communities */}
            {communities.map((community) => (
                <div
                    key={`community-${community.id}`}
                    className="flex-shrink-0 w-28 text-center"
                >
                    {/* Community Avatar Circle */}
                    <Link href={`/community/${community.id}`} className="block">
                        <div className="relative mb-2 mx-auto w-20 h-20">
                            {/* Gradient Ring */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCB045]" />
                            {/* Inner Circle */}
                            <div className="absolute inset-[3px] rounded-full bg-[#355E3B] flex items-center justify-center overflow-hidden">
                                {community.logo_url ? (
                                    <img
                                        src={community.logo_url}
                                        alt={community.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Building2 size={28} className="text-white/50" />
                                )}
                            </div>
                            {/* Join/Member Button */}
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleJoinCommunity(community.id);
                                }}
                                disabled={joinedCommunityIds.has(community.id)}
                                className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#355E3B] transition-all ${
                                    joinedCommunityIds.has(community.id)
                                        ? "bg-[#2FF801]"
                                        : "bg-[#00F5FF] hover:bg-[#00F5FF]/80 cursor-pointer"
                                }`}
                            >
                                {joinedCommunityIds.has(community.id) ? (
                                    <span className="text-black text-xs">✓</span>
                                ) : (
                                    <span className="text-black text-xs font-bold">+</span>
                                )}
                            </button>
                        </div>

                        {/* Community Name */}
                        <p className="text-xs font-semibold text-white truncate">
                            {community.name}
                        </p>
                        <p className="text-[10px] text-white/50 truncate">
                            {community.organization_type === "club" ? "Club" : community.organization_type === "pharmacy" ? "Apotheke" : "Community"}
                        </p>
                    </Link>
                </div>
            ))}
```

Stelle sicher, dass `Building2` im Import von `lucide-react` enthalten ist (Zeile 5).

- [ ] **Step 8: useEffect nicht vergessen**

Das bestehende `useEffect` auf Zeile 174 muss nicht geändert werden, da `showCommunities` bereits in den Props ist und das Fetching innerhalb von `fetchSuggestedUsers` passiert.

- [ ] **Step 9: Commit**

```bash
git add src/components/social/suggested-users.tsx
git commit -m "feat: add community suggestions to SuggestedUsers component

Communities are fetched from organizations table and displayed alongside
users in the horizontal stories-style scroll. Join via POST /api/community/{id}/join.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
"
```

---

## Task 3: Feed-Seite anpassen

**Files:**
- Modify: `src/app/feed/page.tsx`

- [ ] **Step 1: `showCommunities={true}` an SuggestedUsers übergeben**

Finde in `feed/page.tsx` das `SuggestedUsers`-Component (ca. Zeile 42-45):

```tsx
<SuggestedUsers
    limit={8}
    showViewAll={true}
/>
```

Ändere es zu:

```tsx
<SuggestedUsers
    limit={8}
    showViewAll={true}
    showCommunities={true}
/>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/feed/page.tsx
git commit -m "feat: enable community suggestions on social discover section

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
"
```

---

## Verifizierung

Nach dem Implementieren:

1. Starte den Dev-Server: `npm run dev`
2. Öffne `/feed` und logge dich ein
3. Prüfe die "Suggested for you" Sektion — es sollten sowohl User-Avatare als auch Community-Karten mit Building2-Icon erscheinen
4. Klicke auf eine Community-Karte → Navigation zu `/community/{id}`
5. Klicke auf den Plus-Button → Community beitreten, Seite reloadet, Checkmark erscheint

---

## Spec-Abdeckungsprüfung

- [x] Im Bereich "Entdecken" werden sowohl User- als auch Community-Vorschläge angezeigt → Task 2
- [x] Community-Karten im gleichen Stories-Style wie User-Vorschläge → Task 2, Step 7
- [x] Klick auf Community-Karte navigiert zu `/community/{id}` → Task 2, Step 7 (Link href)
- [x] Plus-Button tritt Community bei (via neuer API-Endpoint) → Task 1 + Task 2, Step 5
- [x] Bereits beigetretene Communities zeigen Checkmark statt Plus → Task 2, Step 7 (conditional rendering)
- [x] Bestehende User-Vorschläge funktionieren unverändert → `showCommunities` default `false`
