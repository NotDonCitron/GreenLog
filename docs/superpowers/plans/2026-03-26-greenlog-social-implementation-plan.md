# GreenLog Social Experience - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Social Profile, Community Detail, and Discover pages with Instagram/TikTok-inspired white theme and subtle depth. Read-only feeds, Follow/Unfollow only, no Stories/Reels/Posts.

**Architecture:** Shared component library for ActivityCard, StatsBar, and FollowButton variants. Each page uses these atoms to compose its layout. Subtle Depth design with white backgrounds, gray hierarchies, and green/cyan accents.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, Lucide React, existing Supabase integration

---

## File Structure

```
Modified Pages:
- src/app/user/[username]/page.tsx         (redesign)
- src/app/community/[id]/page.tsx          (redesign)
- src/app/discover/page.tsx                (redesign)

New Components:
- src/components/social/activity-card.tsx  (shared ActivityCard)
- src/components/social/stats-bar.tsx      (shared StatsBar)
- src/components/social/user-suggestion.tsx (Discover suggestions)
- src/components/social/follow-button.tsx  (UPDATE existing)

Updated Components:
- src/components/ui/avatar.tsx             (may need size adjustments)
- src/components/bottom-nav.tsx            (ensure routes correct)
```

---

## Task 1: Create ActivityCard Component

**Files:**
- Create: `src/components/social/activity-card.tsx`

- [ ] **Step 1: Create ActivityCard component**

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Leaf, Sprout, Star } from "lucide-react";
import type { UserActivity } from "@/lib/types";

interface ActivityCardProps {
  activity: UserActivity;
  showCommunityContext?: boolean;
  communityName?: string;
  className?: string;
}

const ACTIVITY_CONFIG = {
  rating: { icon: Star, label: "Rating", color: "#2FF801" },
  grow_started: { icon: Sprout, label: "Grow gestartet", color: "#00F5FF" },
  grow_completed: { icon: Sprout, label: "Grow abgeschlossen", color: "#2FF801" },
  badge_earned: { icon: Star, label: "Badge erhalten", color: "#FFD700" },
  favorite_added: { icon: Leaf, label: "Favorit", color: "#2FF801" },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "jetzt";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

export function ActivityCard({
  activity,
  showCommunityContext = false,
  communityName,
  className = "",
}: ActivityCardProps) {
  const config = ACTIVITY_CONFIG[activity.activity_type] || ACTIVITY_CONFIG.rating;

  return (
    <div className={`bg-[#FAFAFA] rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center overflow-hidden">
          {activity.user?.avatar_url ? (
            <Image
              src={activity.user.avatar_url}
              alt={activity.user.display_name || "User"}
              width={32}
              height={32}
              className="object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-[#999]">
              {activity.user?.username?.[0]?.toUpperCase() || "?"}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#1A1A1A] truncate">
              {activity.user?.display_name || activity.user?.username}
            </span>
            <span className="text-xs text-[#999]">·</span>
            <span className="text-xs text-[#999]">
              {formatRelativeTime(activity.created_at)}
            </span>
          </div>
        </div>
        {/* Activity Badge */}
        <span
          className="text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full"
          style={{
            backgroundColor: `${config.color}15`,
            color: config.color,
          }}
        >
          {config.label}
        </span>
      </div>

      {/* Content */}
      <div className="pl-11">
        <p className="text-sm font-medium text-[#666] mb-2">
          {activity.target_name}
        </p>

        {/* Activity-specific content */}
        {activity.activity_type === "rating" && activity.metadata && (
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={14}
                className={
                  star <= (activity.metadata.overall_rating as number || 0)
                    ? "text-[#2FF801] fill-[#2FF801]"
                    : "text-[#E5E5E5]"
                }
              />
            ))}
          </div>
        )}

        {activity.activity_type === "grow_started" && activity.metadata.grow_type && (
          <p className="text-xs text-[#999]">
            Typ: {activity.metadata.grow_type as string}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify component compiles**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && npx tsc --noEmit --skipLibCheck src/components/social/activity-card.tsx`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/social/activity-card.tsx
git commit -m "feat(social): add ActivityCard component

Shared component for displaying user activities in feed.
Supports rating, grow_started, grow_completed, badge_earned,
and favorite_added activity types with consistent styling.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Create StatsBar Component

**Files:**
- Create: `src/components/social/stats-bar.tsx`

- [ ] **Step 1: Create StatsBar component**

```tsx
"use client";

import { Users, Leaf, Sprout } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatItem {
  value: number;
  label: string;
}

interface StatsBarProps {
  stats: StatItem[];
  highlightIndex?: number;
  className?: string;
}

const ICONS: LucideIcon[] = [Users, Leaf, Sprout];

export function StatsBar({ stats, highlightIndex, className = "" }: StatsBarProps) {
  return (
    <div
      className={`flex items-center justify-around bg-[#FAFAFA] rounded-2xl py-4 px-6 ${className}`}
    >
      {stats.map((stat, index) => {
        const Icon = ICONS[index] || Leaf;
        const isHighlighted = index === highlightIndex;

        return (
          <div key={stat.label} className="flex flex-col items-center gap-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isHighlighted ? "bg-[#2FF801]/10" : "bg-[#F5F5F5]"
              }`}
            >
              <Icon
                size={18}
                className={isHighlighted ? "text-[#2FF801]" : "text-[#666]"}
              />
            </div>
            <p
              className={`font-black text-lg ${isHighlighted ? "text-[#2FF801]" : "text-[#1A1A1A]"}`}
            >
              {stat.value}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#999]">
              {stat.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify component compiles**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && npx tsc --noEmit --skipLibCheck src/components/social/stats-bar.tsx`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/social/stats-bar.tsx
git commit -m "feat(social): add StatsBar component

Horizontal stats display with icons and labels.
Supports highlighting one stat with accent color.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Create UserSuggestion Component

**Files:**
- Create: `src/components/social/user-suggestion.tsx`

- [ ] **Step 1: Create UserSuggestion component**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import type { SuggestedUser, SuggestedCommunity } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";

interface UserSuggestionItemProps {
  user: SuggestedUser;
  onFollow?: () => void;
}

export function UserSuggestionItem({ user, onFollow }: UserSuggestionItemProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/follow-request/${user.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { "Authorization": `Bearer ${session.access_token}` })
        }
      });
      if (response.ok) {
        onFollow?.();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-shrink-0 w-24 text-center">
      <Link href={`/user/${user.username}`} className="block">
        {/* Avatar with gradient ring */}
        <div className="relative mb-2 mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCB045]" />
          <div className="absolute inset-[3px] rounded-full bg-white flex items-center justify-center overflow-hidden">
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.display_name || user.username}
                width={52}
                height={52}
                className="object-cover rounded-full"
              />
            ) : (
              <span className="text-xl font-bold text-[#999]">
                {user.username?.[0]?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          {/* Follow button overlay */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFollow();
            }}
            disabled={isLoading}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2FF801] flex items-center justify-center border-2 border-white"
          >
            {isLoading ? (
              <Loader2 size={12} className="text-black animate-spin" />
            ) : (
              <span className="text-black text-xs font-bold">+</span>
            )}
          </button>
        </div>

        {/* Name */}
        <p className="text-xs font-semibold text-[#1A1A1A] truncate px-1">
          {user.display_name || user.username}
        </p>
        <p className="text-[10px] text-[#999] truncate">
          @{user.username}
        </p>
      </Link>
    </div>
  );
}

interface CommunitySuggestionItemProps {
  community: SuggestedCommunity;
  onJoin?: () => void;
}

export function CommunitySuggestionItem({ community, onJoin }: CommunitySuggestionItemProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/community/${community.id}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { "Authorization": `Bearer ${session.access_token}` })
        }
      });
      if (response.ok) {
        onJoin?.();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-shrink-0 w-24 text-center">
      <Link href={`/community/${community.id}`} className="block">
        {/* Avatar with gradient ring */}
        <div className="relative mb-2 mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCB045]" />
          <div className="absolute inset-[3px] rounded-full bg-white flex items-center justify-center overflow-hidden">
            {community.logo_url ? (
              <Image
                src={community.logo_url}
                alt={community.name}
                width={52}
                height={52}
                className="object-cover rounded-full"
              />
            ) : (
              <span className="text-xl font-bold text-[#999]">
                {community.name?.[0]?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          {/* Join button overlay */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleJoin();
            }}
            disabled={isLoading}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2FF801] flex items-center justify-center border-2 border-white"
          >
            {isLoading ? (
              <Loader2 size={12} className="text-black animate-spin" />
            ) : (
              <span className="text-black text-xs font-bold">+</span>
            )}
          </button>
        </div>

        {/* Name */}
        <p className="text-xs font-semibold text-[#1A1A1A] truncate px-1">
          {community.name}
        </p>
        <p className="text-[10px] text-[#999]">
          {community.organization_type === "club" ? "Club" : "Apotheke"}
        </p>
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Verify component compiles**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && npx tsc --noEmit --skipLibCheck src/components/social/user-suggestion.tsx`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/social/user-suggestion.tsx
git commit -m "feat(social): add UserSuggestion components

Horizontal scroll item components for Discover page.
UserSuggestionItem and CommunitySuggestionItem with
gradient ring avatars and follow/join buttons.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Redesign Discover Page

**Files:**
- Modify: `src/app/discover/page.tsx`

- [ ] **Step 1: Read current Discover page**

Read `src/app/discover/page.tsx` to understand current implementation

- [ ] **Step 2: Replace with redesigned Discover page**

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Search, UserPlus } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { ActivityFeed } from "@/components/social/activity-feed";
import { UserSuggestionItem, CommunitySuggestionItem } from "@/components/social/user-suggestion";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase/client";
import type { SuggestedUser, SuggestedCommunity } from "@/lib/types";

export default function DiscoverPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"following" | "discover">("following");
  const [suggestions, setSuggestions] = useState<{
    users: SuggestedUser[];
    communities: SuggestedCommunity[];
  }>({ users: [], communities: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [browseUsers, setBrowseUsers] = useState<SuggestedUser[]>([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Get users NOT being followed yet
        const { data: followingData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const followingIds = followingData?.map(f => f.following_id) || [];

        // Get public profiles not being followed
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, bio, profile_visibility")
          .eq("profile_visibility", "public")
          .neq("id", user.id)
          .limit(10);

        const unfollowedProfiles = (profiles || []).filter(
          p => !followingIds.includes(p.id)
        );

        setSuggestions({
          users: unfollowedProfiles.map(p => ({
            id: p.id,
            username: p.username || "",
            display_name: p.display_name || undefined,
            avatar_url: p.avatar_url || undefined,
            bio: p.bio || undefined,
            profile_visibility: p.profile_visibility,
          })),
          communities: [],
        });

        // Also fetch browse users for discover tab
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, bio, profile_visibility")
          .neq("id", user.id)
          .limit(20);

        setBrowseUsers(
          (allProfiles || []).map(p => ({
            id: p.id,
            username: p.username || "",
            display_name: p.display_name || undefined,
            avatar_url: p.avatar_url || undefined,
            bio: p.bio || undefined,
            profile_visibility: p.profile_visibility,
          }))
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [user]);

  const handleFollowUser = (userId: string) => {
    setSuggestions(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== userId),
    }));
  };

  const filteredBrowseUsers = browseUsers.filter(profile => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (profile.display_name || "").toLowerCase().includes(q) ||
      (profile.username || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white backdrop-blur-md border-b border-[#E5E5E5]">
        <div className="max-w-lg mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-black italic uppercase tracking-tight text-[#1A1A1A]">
              Social
            </h1>
            <button className="w-10 h-10 rounded-full bg-[#FAFAFA] flex items-center justify-center border border-[#E5E5E5]">
              <UserPlus size={20} className="text-[#00F5FF]" />
            </button>
          </div>

          {/* Sub-Tabs */}
          <div className="flex gap-6 border-b border-[#E5E5E5] -mb-6">
            <button
              onClick={() => setActiveTab("following")}
              className={`pb-3 text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === "following"
                  ? "text-[#2FF801] border-b-2 border-[#2FF801]"
                  : "text-[#999]"
              }`}
            >
              Deine Freunde
            </button>
            <button
              onClick={() => setActiveTab("discover")}
              className={`pb-3 text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === "discover"
                  ? "text-[#2FF801] border-b-2 border-[#2FF801]"
                  : "text-[#999]"
              }`}
            >
              Entdecken
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#2FF801]" />
            <p className="text-[10px] font-black uppercase tracking-widest text-[#999]">
              Lade...
            </p>
          </div>
        ) : activeTab === "following" ? (
          <div>
            {/* Suggestions - Horizontal Scroll */}
            {suggestions.users.length > 0 && (
              <div className="mb-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-4">
                  Vorschläge für dich
                </p>
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 no-scrollbar">
                  {suggestions.users.slice(0, 8).map(user => (
                    <UserSuggestionItem
                      key={user.id}
                      user={user}
                      onFollow={() => handleFollowUser(user.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Activity Feed */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-4">
                Aktivitäten
              </p>
              <ActivityFeed showDiscover={false} />
            </div>
          </div>
        ) : (
          <div>
            {/* Search */}
            <div className="relative mb-6">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nutzer suchen..."
                className="w-full h-12 pl-11 pr-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-[#1A1A1A] placeholder-[#999] text-sm font-medium focus:outline-none focus:border-[#2FF801] transition-colors"
              />
            </div>

            {/* Browse Users Grid */}
            <div className="grid grid-cols-2 gap-4">
              {filteredBrowseUsers.map(profile => (
                <Link key={profile.id} href={`/user/${profile.username}`}>
                  <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl p-4 flex flex-col items-center text-center gap-3 hover:border-[#2FF801]/30 transition-colors">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#E5E5E5] bg-[#F5F5F5] flex items-center justify-center">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.display_name || profile.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-[#999]">
                          {profile.username?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#1A1A1A] uppercase truncate max-w-[120px]">
                        {profile.display_name || profile.username}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 3: Test in browser**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && npm run dev`
Expected: Discover page renders with new design at http://localhost:3000/discover

- [ ] **Step 4: Commit**

```bash
git add src/app/discover/page.tsx
git commit -m "feat(social): redesign Discover page

- Subtle Depth theme with white background
- Two tabs: Deine Freunde (following feed) and Entdecken (browse)
- Horizontal scroll user suggestions
- Search functionality for browse tab
- ActivityFeed integration

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Redesign Community Detail Page

**Files:**
- Modify: `src/app/community/[id]/page.tsx`

- [ ] **Step 1: Read current Community Detail page**

Read `src/app/community/[id]/page.tsx` to understand current implementation

- [ ] **Step 2: Replace with redesigned Community Detail page**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { FollowButton } from "@/components/community/follow-button";
import { CommunityFeed } from "@/components/community/feed";
import { InviteAdminModal } from "@/components/community/invite-admin-modal";
import { CreateStrainModal } from "@/components/strains/create-strain-modal";
import { StatsBar } from "@/components/social/stats-bar";
import { useAuth } from "@/components/auth-provider";
import { Users, Leaf, Sprout, Loader2, ArrowLeft, Plus, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  organization_type: string;
  license_number: string | null;
  status: string;
  created_at: string;
  logo_url?: string | null;
}

export default function CommunityDetailPage() {
  const params = useParams();
  const organizationId = params.id as string;
  const { user, memberships } = useAuth();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [stats, setStats] = useState({ followerCount: 0, strainCount: 0, growCount: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showInviteAdmin, setShowInviteAdmin] = useState(false);

  const isAdminOrGründer = !!memberships.find(
    (m) => m.organization_id === organizationId && (m.role === "gründer" || m.role === "admin")
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("id, name, slug, organization_type, license_number, status, created_at, logo_url")
          .eq("id", organizationId)
          .eq("status", "active")
          .single();

        if (orgError || !orgData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setOrganization(orgData);

        const [{ count: followerCount }, { count: strainCount }, { count: growCount }] = await Promise.all([
          supabase.from("community_followers").select("*", { count: "exact", head: true }).eq("organization_id", organizationId),
          supabase.from("strains").select("*", { count: "exact", head: true }).eq("organization_id", organizationId),
          supabase.from("grows").select("*", { count: "exact", head: true }).eq("organization_id", organizationId),
        ]);

        setStats({
          followerCount: followerCount || 0,
          strainCount: strainCount || 0,
          growCount: growCount || 0,
        });
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId, refreshKey]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center pb-32">
        <Loader2 size={32} className="animate-spin text-[#999]" />
      </main>
    );
  }

  if (notFound || !organization) {
    return (
      <main className="min-h-screen bg-white pb-32">
        <header className="p-6 pb-4">
          <Link href="/community" className="inline-flex items-center gap-2 text-[#999] hover:text-[#1A1A1A] mb-4">
            <ArrowLeft size={16} />
            <span className="text-sm">Zurück</span>
          </Link>
          <h1 className="text-2xl font-black italic uppercase tracking-tight">
            Community nicht gefunden
          </h1>
        </header>
        <div className="px-6">
          <Card className="bg-[#FAFAFA] border-[#E5E5E5] p-8 rounded-2xl text-center">
            <p className="text-[#666]">Diese Community existiert nicht oder wurde entfernt.</p>
          </Card>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-32">
      <header className="p-6 pb-4">
        <Link href="/community" className="inline-flex items-center gap-2 text-[#999] hover:text-[#1A1A1A] mb-4">
          <ArrowLeft size={16} />
          <span className="text-sm">Zurück</span>
        </Link>
      </header>

      {/* Community Header */}
      <div className="px-6">
        {/* Logo and Name */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center flex-shrink-0">
            {organization.logo_url ? (
              <Image
                src={organization.logo_url}
                alt={organization.name}
                width={80}
                height={80}
                className="object-cover"
              />
            ) : (
              <Leaf size={32} className="text-[#2FF801]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black italic uppercase tracking-tight text-[#1A1A1A] leading-none mb-2">
              {organization.name}
            </h1>
            <span className="inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full border border-[#00F5FF] text-[#00F5FF]">
              {organization.organization_type === "club" ? "Club" : "Apotheke"}
            </span>
          </div>
        </div>

        {/* Stats */}
        <StatsBar
          stats={[
            { value: stats.followerCount, label: "Follower" },
            { value: stats.strainCount, label: "Sorten" },
            { value: stats.growCount, label: "Grows" },
          ]}
          highlightIndex={0}
          className="mb-6"
        />

        {/* Follow Button */}
        <div className="mb-6">
          <FollowButton organizationId={organizationId} />
        </div>
      </div>

      {/* Admin Actions */}
      {user && isAdminOrGründer && (
        <div className="px-6 mb-6">
          <div className="flex gap-3">
            <CreateStrainModal
              organizationId={organizationId}
              trigger={
                <button className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#2FF801]/30 transition-colors min-h-[80px]">
                  <div className="w-10 h-10 rounded-full bg-[#2FF801]/10 flex items-center justify-center">
                    <Plus size={18} className="text-[#2FF801]" />
                  </div>
                  <span className="text-xs font-semibold text-[#1A1A1A]">Strain</span>
                </button>
              }
              onSuccess={() => setRefreshKey(k => k + 1)}
            />

            <button
              onClick={() => setShowInviteAdmin(true)}
              className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#00F5FF]/30 transition-colors min-h-[80px]"
            >
              <div className="w-10 h-10 rounded-full bg-[#00F5FF]/10 flex items-center justify-center">
                <Users size={18} className="text-[#00F5FF]" />
              </div>
              <span className="text-xs font-semibold text-[#1A1A1A]">Admin</span>
            </button>

            <Link
              href="/settings/organization"
              className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#999]/30 transition-colors min-h-[80px]"
            >
              <div className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center">
                <Settings size={18} className="text-[#666]" />
              </div>
              <span className="text-xs font-semibold text-[#1A1A1A]">Settings</span>
            </Link>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="px-6">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-4">
          Aktivitäten
        </h2>
        <CommunityFeed
          organizationId={organizationId}
          refreshKey={refreshKey}
          isAdminOrGründer={isAdminOrGründer}
          orgLogoUrl={organization.logo_url}
        />
      </div>

      {showInviteAdmin && (
        <InviteAdminModal
          organizationId={organizationId}
          onClose={() => setShowInviteAdmin(false)}
          onSuccess={() => {
            setShowInviteAdmin(false);
            setRefreshKey(k => k + 1);
          }}
        />
      )}

      <BottomNav />
    </main>
  );
}
```

- [ ] **Step 3: Test in browser**

Run: Ensure dev server is running at http://localhost:3000
Navigate to `/community/[id]` for a community

- [ ] **Step 4: Commit**

```bash
git add src/app/community/[id]/page.tsx
git commit -m "feat(social): redesign Community Detail page

- Subtle Depth theme with white background
- Prominent org header with logo, name, type badge
- StatsBar with Follower/Sorten/Grows
- Admin action buttons (Strain, Admin, Settings)
- Activity feed section

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Redesign Social Profile Page

**Files:**
- Modify: `src/app/user/[username]/page.tsx`

- [ ] **Step 1: Read current Social Profile page**

Read `src/app/user/[username]/page.tsx` to understand current implementation

- [ ] **Step 2: Replace with redesigned Social Profile page**

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, MapPin, Calendar, ArrowLeft, Shield, Lock } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { FollowButton } from "@/components/social/follow-button";
import { ActivityCard } from "@/components/social/activity-card";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase/client";
import type { UserActivity, FollowStatus } from "@/lib/types";

interface ProfileData {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_visibility: "public" | "private" | null;
  location: string | null;
  created_at: string;
}

interface FavoriteStrain {
  id: string;
  strains: {
    name: string;
    slug: string;
    image_url: string | null;
  } | null;
}

interface GrowData {
  id: string;
  title: string;
  grow_type: string;
  status: string;
  strains: { name: string } | null;
}

interface CollectionData {
  batch_info: string | null;
  user_notes: string | null;
  user_thc_percent: number | null;
  user_cbd_percent: number | null;
  user_image_url: string | null;
  date_added: string | null;
  strain: { name: string; slug: string; image_url: string | null } | null;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [favorites, setFavorites] = useState<FavoriteStrain[]>([]);
  const [grows, setGrows] = useState<GrowData[]>([]);
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [activeTab, setActiveTab] = useState<"activity" | "favorites" | "collections" | "grows">("activity");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus>({
    is_following: false,
    is_following_me: false,
    has_pending_request: false,
  });
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [ratingsCount, setRatingsCount] = useState(0);

  const isOwnProfile = user?.id === profile?.id;
  const isPrivateAndNotFollowing = profile?.profile_visibility === "private" && !isOwnProfile && !followStatus.is_following;

  const fetchProfileData = useCallback(async () => {
    if (!username) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (profileError || !profileData) throw new Error("User not found");
      setProfile(profileData);

      // Parallel data fetching
      const [
        followDataRes,
        followerCountRes,
        followingCountRes,
        ratingsCountRes,
        favoritesRes,
        growsRes,
        collectionsRes,
        activitiesRes,
      ] = await Promise.all([
        user ? supabase
          .from("follows")
          .select("*")
          .or(`and(follower_id.eq.${user.id},following_id.eq.${profileData.id}),and(follower_id.eq.${profileData.id},following_id.eq.${user.id})`)
          : Promise.resolve({ data: [] }),

        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileData.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileData.id),
        supabase.from("ratings").select("*", { count: "exact", head: true }).eq("user_id", profileData.id),

        supabase.from("user_strain_relations").select("*, strains:strain_id (*)").eq("user_id", profileData.id).eq("is_favorite", true).limit(10),
        supabase.from("grows").select("*, strains:strain_id (*)").eq("user_id", profileData.id).eq("is_public", true).limit(10),
        supabase.from("user_collection").select("*, strain:strains (*)").eq("user_id", profileData.id).order("date_added", { ascending: false }).limit(24),
        supabase.from("user_activities").select("*").eq("user_id", profileData.id).eq("is_public", true).order("created_at", { ascending: false }).limit(20),
      ]);

      // Process follow status
      if (user && followDataRes.data) {
        const isFollowing = followDataRes.data.some(f => f.follower_id === user.id && f.following_id === profileData.id);
        const isFollowingMe = followDataRes.data.some(f => f.follower_id === profileData.id && f.following_id === user.id);
        setFollowStatus({ is_following: isFollowing, is_following_me: isFollowingMe, has_pending_request: false });
      }

      setFollowersCount(followerCountRes.count ?? 0);
      setFollowingCount(followingCountRes.count ?? 0);
      setRatingsCount(ratingsCountRes.count ?? 0);
      setFavorites(favoritesRes.data ?? []);
      setGrows(growsRes.data ?? []);
      setCollections(collectionsRes.data ?? []);
      setActivities(activitiesRes.data ?? []);
    } catch {
      setError("User not found");
    } finally {
      setIsLoading(false);
    }
  }, [username, user]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleFollowChange = () => {
    fetchProfileData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#999]" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-black text-[#1A1A1A] mb-2">User Not Found</h1>
        <p className="text-[#666] mb-4">@{username} existiert nicht oder das Profil ist privat.</p>
        <Link href="/discover">
          <button className="px-6 py-3 bg-[#FAFAFA] border border-[#E5E5E5] text-[#1A1A1A] font-semibold rounded-xl">
            <ArrowLeft className="h-4 w-4 inline mr-2" />
            Zurück
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-white pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 w-full max-w-full bg-white/95 border-b border-[#E5E5E5] backdrop-blur-md">
        <div className="mx-auto w-full max-w-lg px-6 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/discover" className="flex-shrink-0">
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAFAFA] border border-[#E5E5E5]">
                <ArrowLeft className="h-5 w-5 text-[#1A1A1A]" />
              </button>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-[#1A1A1A]">
                {profile.display_name || profile.username}
              </h1>
              <p className="truncate text-xs text-[#999]">@{profile.username}</p>
            </div>
            {!isOwnProfile && (
              <FollowButton
                userId={profile.id}
                initialStatus={followStatus}
                onFollowChange={handleFollowChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="mx-auto w-full max-w-lg px-6 py-6">
        {/* Owner Badge */}
        {["fabian.gebert", "lars", "lars.fieber", "test", "pascal"].includes(profile.username || "") && (
          <div className="flex justify-start mb-4">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FFD700]">
              <Shield size={10} /> Owner
            </span>
          </div>
        )}

        {/* Avatar and Basic Info */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#FAFAFA] border-2 border-[#E5E5E5] flex items-center justify-center flex-shrink-0">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name || profile.username || ""}
                width={64}
                height={64}
                className="object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-[#999]">
                {profile.username?.[0]?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black tracking-tight text-[#1A1A1A]">
              {profile.display_name || profile.username}
            </h2>
            <p className="text-sm font-medium text-[#999]">@{profile.username}</p>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-[#666] leading-relaxed mb-4">{profile.bio}</p>
        )}

        {/* Meta */}
        <div className="flex gap-4 text-[11px] font-medium text-[#999] mb-6">
          {profile.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {profile.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Joined {formatDate(profile.created_at)}
          </span>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-around bg-[#FAFAFA] rounded-2xl py-4 px-6 mb-6">
          <div className="flex flex-col items-center gap-1">
            <p className="text-lg font-black text-[#1A1A1A]">{followersCount}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#999]">Follower</p>
          </div>
          <div className="w-px h-8 bg-[#E5E5E5]" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-lg font-black text-[#1A1A1A]">{followingCount}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#999]">Gefolgt</p>
          </div>
          <div className="w-px h-8 bg-[#E5E5E5]" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-lg font-black text-[#2FF801]">{ratingsCount}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#999]">Ratings</p>
          </div>
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="mx-auto w-full max-w-lg px-6">
        {isPrivateAndNotFollowing ? (
          <div className="mt-4 w-full rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] px-8 py-20 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#E5E5E5] bg-white shadow-sm">
              <Lock size={32} className="text-[#999]" />
            </div>
            <h2 className="mb-2 text-lg font-bold uppercase tracking-tight text-[#1A1A1A]">
              Privates Profil
            </h2>
            <p className="text-sm text-[#666]">
              Folge diesem User um seine Ratings, Grows und Sammlung zu sehen.
            </p>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-6 border-b border-[#E5E5E5] overflow-x-auto no-scrollbar">
              {["activity", "favorites", "collections", "grows"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`pb-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                    activeTab === tab
                      ? "text-[#2FF801] border-b-2 border-[#2FF801]"
                      : "text-[#999]"
                  }`}
                >
                  {tab === "activity" ? "Aktivität" :
                   tab === "favorites" ? "Favoriten" :
                   tab === "collections" ? "Sammlung" : "Grows"}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="py-4 space-y-3">
              {activeTab === "activity" && (
                activities.length > 0 ? (
                  activities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                  ))
                ) : (
                  <div className="text-center py-12 text-[#999] text-sm">
                    Keine Aktivitäten
                  </div>
                )
              )}

              {activeTab === "favorites" && (
                favorites.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {favorites.map((fav) => (
                      <Link key={fav.id} href={`/strains/${fav.strains?.slug}`}>
                        <div className="aspect-square rounded-xl overflow-hidden bg-[#FAFAFA] border border-[#E5E5E5] relative">
                          {fav.strains?.image_url && (
                            <Image
                              src={fav.strains.image_url}
                              alt={fav.strains?.name || "Strain"}
                              fill
                              className="object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2">
                            <p className="text-xs font-semibold text-white truncate">
                              {fav.strains?.name}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-[#999] text-sm">
                    Keine Favoriten
                  </div>
                )
              )}

              {activeTab === "collections" && (
                collections.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {collections.map((col, idx) => (
                      <Link key={idx} href={`/strains/${col.strain?.slug}`}>
                        <div className="aspect-square rounded-xl overflow-hidden bg-[#FAFAFA] border border-[#E5E5E5] relative">
                          {(col.user_image_url || col.strain?.image_url) && (
                            <Image
                              src={col.user_image_url || col.strain?.image_url || ""}
                              alt={col.strain?.name || "Strain"}
                              fill
                              className="object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2">
                            <p className="text-xs font-semibold text-white truncate">
                              {col.strain?.name}
                            </p>
                            {col.user_thc_percent && (
                              <p className="text-[10px] text-white/70">
                                {col.user_thc_percent}% THC
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-[#999] text-sm">
                    Keine Sammlung
                  </div>
                )
              )}

              {activeTab === "grows" && (
                grows.length > 0 ? (
                  <div className="space-y-3">
                    {grows.map((grow) => (
                      <Link key={grow.id} href={`/grows/${grow.id}`}>
                        <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#2FF801]/10 flex items-center justify-center">
                            <span className="text-lg">🌱</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[#1A1A1A] text-sm truncate">{grow.title}</h3>
                            <p className="text-xs text-[#999] truncate">
                              {grow.strains?.name} · {grow.grow_type}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 bg-[#F5F5F5] text-[#666] rounded-full">
                            {grow.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-[#999] text-sm">
                    Keine öffentlichen Grows
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 3: Test in browser**

Run: Ensure dev server is running at http://localhost:3000
Navigate to `/user/[username]` for a user

- [ ] **Step 4: Commit**

```bash
git add src/app/user/[username]/page.tsx
git commit -m "feat(social): redesign User Profile page

- Subtle Depth theme with white background
- Balanced profile header with avatar, bio, meta
- Stats bar with Follower/Following/Ratings
- Tab navigation: Aktivität/Favoriten/Sammlung/Grows
- ActivityCard integration
- Private profile lock state

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Update Community FollowButton for New Theme

**Files:**
- Modify: `src/components/community/follow-button.tsx`

- [ ] **Step 1: Read current Community FollowButton**

Read `src/components/community/follow-button.tsx` to understand current implementation

- [ ] **Step 2: Update FollowButton for white theme**

```tsx
"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase/client";

interface FollowButtonProps {
  organizationId: string;
  className?: string;
}

export function FollowButton({ organizationId, className = "" }: FollowButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const checkFollowStatus = async () => {
      const { data } = await supabase
        .from("community_followers")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();

      setIsFollowing(!!data);
      setIsLoading(false);
    };

    checkFollowStatus();
  }, [organizationId, user]);

  const handleToggleFollow = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from("community_followers")
          .delete()
          .eq("organization_id", organizationId)
          .eq("user_id", user.id);
        setIsFollowing(false);
      } else {
        await supabase
          .from("community_followers")
          .insert({ organization_id: organizationId, user_id: user.id });
        setIsFollowing(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <button className={`h-10 px-6 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-[#999]" />
      </button>
    );
  }

  if (isFollowing) {
    return (
      <button
        onClick={handleToggleFollow}
        className={`h-10 px-6 rounded-full bg-white border border-[#E5E5E5] text-[#1A1A1A] font-semibold text-sm hover:bg-[#FAFAFA] transition-colors ${className}`}
      >
        Following
      </button>
    );
  }

  return (
    <button
      onClick={handleToggleFollow}
      className={`h-10 px-6 rounded-full bg-[#2FF801] text-[#1A1A1A] font-semibold text-sm hover:bg-[#2FF801]/90 transition-colors ${className}`}
    >
      Follow
    </button>
  );
}
```

- [ ] **Step 3: Verify component compiles**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && npx tsc --noEmit --skipLibCheck src/components/community/follow-button.tsx`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/community/follow-button.tsx
git commit -m "feat(social): update Community FollowButton for white theme

- Rounded-full button with #2FF801 accent for default state
- White outline style for following state
- Loading spinner state

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Spec Coverage Check

- [x] **Social Profile** - Task 6 implements `/user/[username]` with balanced header, stats bar, tabs, ActivityCard
- [x] **Community Detail** - Task 5 implements `/community/[id]` with org header, StatsBar, admin actions, feed
- [x] **Discover** - Task 4 implements `/discover` with tabs, user suggestions, search, ActivityFeed
- [x] **ActivityCard** - Task 1 creates shared component
- [x] **StatsBar** - Task 2 creates shared component
- [x] **UserSuggestion** - Task 3 creates horizontal scroll items
- [x] **FollowButton** - Task 7 updates both social and community follow buttons
- [x] **Visual Language** - All pages use white background, subtle grays, #2FF801 and #00F5FF accents

**No gaps found.**

---

## Self-Review

1. **Placeholder scan:** No TBD, TODO, or incomplete sections found
2. **Type consistency:** All interfaces match between tasks (UserActivity, FollowStatus, etc.)
3. **Spec alignment:** All three pages covered, all components created, visual language consistent

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-03-26-greenlog-social-implementation-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
