"use client";

import Link from "next/link";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Heart,
  Leaf,
  Loader2,
  LogOut,
  LogIn,
  Shield,
  Settings,
  Sparkles,
  Sprout,

  Trophy,
  UserRound,
  Zap,
  Calendar,
  Check,
  X,
  GripVertical
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { useToast } from "@/components/toast-provider";

import { FollowersListModal } from "@/components/social/followers-list-modal";
import { AvatarUpload } from "@/components/social/avatar-upload";
import { lazy, Suspense } from "react";
const BadgeShowcase = lazy(() => import("@/components/profile/badge-showcase").then(m => ({ default: m.BadgeShowcase })));
import { OrganizationSwitcher } from "@/components/organization-switcher";
import { useProfile } from "@/hooks/useProfile";
import { Card } from "@/components/ui/card";
import { PublicProfilePreviewCard } from "@/components/profile/public-profile-preview-card";
import { supabase } from "@/lib/supabase/client";
import { ALL_BADGES } from "@/lib/badges";
import { buildPublicProfileBlocks, withDefaultPublicPreferences } from "@/lib/public-profile";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { isAppAdmin } from "@/lib/auth";
import type {
  ProfileBadge,
  ProfileFavorite,
  ProfileStats,
  ProfileViewModel,
} from "@/lib/types";
import type { PublicProfilePreferenceToggleKey } from "@/components/profile/public-profile-preview-card";

const BADGE_ICONS: Record<string, LucideIcon> = {
  starter: Sprout,
  connoisseur: Trophy,
  highflyer: Zap,
  leaf: Leaf,
  dna: Sparkles,
  moon: Sparkles,
  sun: Sparkles,
  flaskconical: Sparkles,
  database: Shield,
};

type StrainForDisplay = {
  avg_thc?: number | null;
  thc_max?: number | null;
};

type StrainForRelation = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  type: string;
  avg_thc: number | null;
  thc_max: number | null;
};

function formatThcDisplay(strain: StrainForDisplay | null | undefined) {
  if (!strain) return "Keine Daten";
  return `${strain.avg_thc || strain.thc_max || "—"}% THC`;
}

function resolveBadgeIcon(iconKey: string) {
  const normalized = iconKey.toLowerCase();
  const matchedKey = Object.keys(BADGE_ICONS).find((key) => normalized.includes(key));
  return matchedKey ? BADGE_ICONS[matchedKey] : Trophy;
}

function createFallbackViewModel(isDemoMode: boolean): ProfileViewModel {
  const stats: ProfileStats = { totalStrains: 0, totalGrows: 0, favoriteCount: 0, unlockedBadgeCount: 0, xp: 0, level: 1, progressToNextLevel: 0, followers: 0, following: 0 };
  const publicPreferences = withDefaultPublicPreferences("guest", null);
  return {
    identity: { email: null, username: "@guest", displayName: "Guest", initials: "GU", profileVisibility: "private", tagline: "", bio: null },
    stats,
    favorites: [],
    badges: [],
    featuredBadgeIds: [],
    activity: [],
    preview: { title: "Privat", description: "", chips: [] },
    publicPreferences,
    publicBlocks: buildPublicProfileBlocks(publicPreferences),
  };
}

function SectionHeader({ eyebrow, title, icon: Icon, iconColor }: { eyebrow?: string; title: string; icon?: LucideIcon; iconColor?: string }) {
  return (
    <div className="space-y-1 px-1">
      {eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#00F5FF]/70">{eyebrow}</p>}
      <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)] flex items-center gap-2 font-display">
        {Icon && <Icon size={18} className={iconColor || "text-[#00F5FF]"} />}
        {title}
      </h2>
    </div>
  );
}

export default function ProfilePage() {
  const { user, session, signOut, loading, isDemoMode } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  // React Query profile data
  const { data: profileData, isLoading, isError, refetch: refetchProfile } = useProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ displayName: "", bio: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [followersModal, setFollowersModal] = useState<{ isOpen: boolean; mode: "followers" | "following" }>({ isOpen: false, mode: "followers" });
  const [carouselFavorites, setCarouselFavorites] = useState<ProfileFavorite[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [selectedFavoriteIndex, setSelectedFavoriteIndex] = useState<number | null>(null);
  const [showBadgeEdit, setShowBadgeEdit] = useState(false);
  const [showBadgeShowcase, setShowBadgeShowcase] = useState(false);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [userBadges, setUserBadges] = useState<Array<{ badge_id: string; badges?: Partial<import("@/lib/badges").BadgeDefinition> }>>([]);
  const [isSavingPublicPreferences, setIsSavingPublicPreferences] = useState(false);
  const [isSavingProfileVisibility, setIsSavingProfileVisibility] = useState(false);
  const currentUserId = user?.id ?? "";
  const isCannalogAdmin = !!currentUserId && isAppAdmin(currentUserId);

  useEffect(() => {
    if (profileData && !isEditing) {
      setCarouselFavorites(profileData.favorites);
      setEditData({
        displayName: profileData.identity.displayName,
        bio: profileData.identity.bio || ""
      });
      setUserBadges(profileData.badges.map(b => ({ badge_id: b.id })));
      setSelectedBadges(profileData.featuredBadgeIds);
    }
  }, [profileData, isEditing]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCarouselFavorites((items) => {
      const oldIndex = items.findIndex((f) => f.relationId === active.id);
      const newIndex = items.findIndex((f) => f.relationId === over.id);
      if (oldIndex === -1 || newIndex === -1) return items;
      const reordered = [...items];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      return reordered;
    });

    if (!user || !session?.access_token || isDemoMode) return;
    setSavingOrder(true);
    const newOrder = Array.from(document.querySelectorAll("[data-relation-id]")).map(
      (el) => el.getAttribute("data-relation-id")!
    );
    if (newOrder.length > 0) {
      fetch("/api/profile/reorder-favorites", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.access_token}`
        },
        body: JSON.stringify({ relationIds: newOrder }),
      }).finally(() => setSavingOrder(false));
    } else {
      setSavingOrder(false);
    }
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    if (toIndex >= carouselFavorites.length) return;

    setCarouselFavorites((items) => {
      const reordered = [...items];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      return reordered;
    });

    if (!user || !session?.access_token || isDemoMode) return;
    setSavingOrder(true);
    const reorderedItems = [...carouselFavorites];
    const [moved] = reorderedItems.splice(fromIndex, 1);
    reorderedItems.splice(toIndex, 0, moved);
    const newOrder = reorderedItems.map((f) => f.relationId);
    if (newOrder.length > 0) {
      fetch("/api/profile/reorder-favorites", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.access_token}`
        },
        body: JSON.stringify({ relationIds: newOrder }),
      }).finally(() => setSavingOrder(false));
    } else {
      setSavingOrder(false);
    }
  };

  useEffect(() => {
    if (selectedFavoriteIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (selectedFavoriteIndex > 0) {
          handleReorder(selectedFavoriteIndex, selectedFavoriteIndex - 1);
          setSelectedFavoriteIndex(selectedFavoriteIndex - 1);
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (selectedFavoriteIndex < carouselFavorites.length - 1) {
          handleReorder(selectedFavoriteIndex, selectedFavoriteIndex + 1);
          setSelectedFavoriteIndex(selectedFavoriteIndex + 1);
        }
      } else if (e.key === "Escape") {
        setSelectedFavoriteIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFavoriteIndex, carouselFavorites.length]);

  function SortableFavoriteCard({ favorite, isSelected, onClick }: { favorite: ProfileFavorite; isSelected?: boolean; onClick?: () => void }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: favorite.relationId });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 50 : "auto",
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        data-relation-id={favorite.relationId}
        className="min-w-[200px] flex-shrink-0"
      >
        <div
          onClick={onClick}
          className={`relative cursor-pointer ${isSelected ? "ring-2 ring-[#2FF801] rounded-[2rem]" : ""}`}
        >
          <Link
            href={`/strains/${favorite.slug}`}
            className="block"
            onClick={(e) => { if (isDragging) e.preventDefault(); }}
          >
            <Card
              className="overflow-hidden rounded-[2rem] border border-[var(--border)]/50 bg-[var(--card)] p-0 shadow-lg hover:border-[#00F5FF]/50 transition-all cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <div className="relative h-36 w-full">
                <img
                  src={favorite.imageUrl || "/strains/placeholder-1.svg"}
                  alt={favorite.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a191b] via-transparent to-transparent" />
                <div className="absolute top-3 right-3 bg-[var(--background)]/60 backdrop-blur-sm rounded-full p-1.5">
                  <GripVertical size={14} className="text-[var(--foreground)]/50" />
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-sm font-black uppercase tracking-tight truncate text-[var(--foreground)] font-display">{favorite.name}</p>
                  <p className="text-[10px] text-[#00F5FF] font-bold">{favorite.thcDisplay}</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (isDemoMode) {
        localStorage.setItem("cannalog_demo_display_name", editData.displayName);
        localStorage.setItem("cannalog_demo_bio", editData.bio);
        await refetchProfile();
        setIsEditing(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: editData.displayName,
          bio: editData.bio
        })
        .eq("id", user.id);

      if (error) throw error;
      await refetchProfile();
      setIsEditing(false);
    } catch (e) {
      console.error("Error saving profile:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBadgeToggle = (badgeId: string) => {
    setSelectedBadges(prev => {
      if (prev.includes(badgeId)) {
        return prev.filter(id => id !== badgeId);
      }
      if (prev.length >= 4) return prev; // Max 4
      return [...prev, badgeId];
    });
  };

  const handlePublicPreferenceChange = async (
    key: PublicProfilePreferenceToggleKey,
    value: boolean
  ) => {
    if (!user || !session?.access_token || isDemoMode || isSavingPublicPreferences || !profileData) return;

    setIsSavingPublicPreferences(true);
    try {
      const response = await fetch("/api/profile/public-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ [key]: value }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message || "Public preferences update failed");
      }

      toastSuccess("Öffentliches Profil aktualisiert");
      await refetchProfile();
    } catch (error) {
      console.error("Public preference update error:", error);
      toastError("Öffentliches Profil konnte nicht aktualisiert werden.");
    } finally {
      setIsSavingPublicPreferences(false);
    }
  };

  const handlePublicVisibilityChange = async (value: boolean) => {
    if (!user || isDemoMode || isSavingProfileVisibility) return;

    setIsSavingProfileVisibility(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ profile_visibility: value ? "public" : "private" })
        .eq("id", user.id);

      if (error) throw error;

      toastSuccess(value ? "Profilseite ist jetzt öffentlich" : "Profilseite ist jetzt privat");
      await refetchProfile();
    } catch (error) {
      console.error("Public visibility update error:", error);
      toastError("Profil-Sichtbarkeit konnte nicht aktualisiert werden.");
    } finally {
      setIsSavingProfileVisibility(false);
    }
  };

  // Show loading while auth is hydrating
  if (loading || isLoading) return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="relative">
        <Loader2 className="animate-spin text-[#00F5FF]" size={48} />
        <div className="absolute inset-0 blur-xl bg-[#00F5FF]/20 animate-pulse" />
      </div>
    </div>
  );

  // Show error state if fetching fails
  if (isError) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="text-[#ff716c] mb-4" size={48} />
        <h2 className="text-xl font-black uppercase italic mb-2">Fehler beim Laden</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-6">Dein Profil konnte nicht geladen werden. Bitte versuche es später erneut.</p>
        <button 
          onClick={() => refetchProfile()}
          className="px-6 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xs font-black uppercase tracking-widest"
        >
          Erneut versuchen
        </button>
        <BottomNav />
      </main>
    );
  }

  // Not logged in - show locked state
  if (!user && !isDemoMode) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00F5FF]/5 blur-[100px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#2FF801]/5 blur-[120px] rounded-full" />
        </div>

        <header className="px-6 pt-12 pb-4 relative z-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">Profil</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--card)] border border-[var(--border)]/50 flex items-center justify-center overflow-hidden p-1">
                <img src="/logo-transparent.png" alt="CannaLog" className="w-full h-full object-contain" />
              </div>
              <Link href="/login" className="px-5 py-2 bg-gradient-to-r from-[#00F5FF] to-[#00e5ee] text-black rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <LogIn size={14} /> Login
              </Link>
            </div>
          </div>

          <div className="bg-[var(--card)] rounded-[2.5rem] p-8 border border-[var(--border)]/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00F5FF]/5 via-transparent to-[#2FF801]/5 pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-[var(--muted)] border-2 border-[var(--border)] flex items-center justify-center">
                <UserRound size={40} className="text-[#484849]" />
              </div>

              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-black uppercase italic tracking-tight font-display text-[var(--foreground)]">Profil gesperrt</h2>
                <p className="text-xs text-[var(--muted-foreground)] font-medium tracking-wide leading-relaxed">
                  Logge dich ein, um deine Sammlung zu verwalten,<br />
                  Achievements zu sammeln und dich mit der<br />
                  Community zu vernetzen.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Link href="/login">
                  <button className="w-full py-4 bg-gradient-to-r from-[#00F5FF] to-[#00e5ee] text-black rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-[#00F5FF]/20">
                    Jetzt Anmelden
                  </button>
                </Link>
                <Link href="/login?signup=true">
                  <button className="w-full py-4 bg-[var(--card)] border border-[var(--border)]/50 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-[#00F5FF]/50 transition-all">
                    Neues Konto erstellen
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <BottomNav />
      </main>
    );
  }

  // Guard: if profileData is undefined, show loading
  if (!profileData) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="relative">
          <Loader2 className="animate-spin text-[#00F5FF]" size={48} />
          <div className="absolute inset-0 blur-xl bg-[#00F5FF]/20 animate-pulse" />
        </div>
      </div>
    );
  }

  const { identity, stats, badges } = profileData;
  const unlockedBadgeById = new Map(badges.map((badge) => [badge.id, badge]));
  const displayedBadgeIds = (selectedBadges.length > 0 ? selectedBadges : badges.slice(0, 4).map((badge) => badge.id))
    .filter((badgeId, index, list) => list.indexOf(badgeId) === index && unlockedBadgeById.has(badgeId))
    .slice(0, 4);
  const displayedBadges = displayedBadgeIds.map((badgeId) => {
    const profileBadge = unlockedBadgeById.get(badgeId);
    const badgeDefinition = ALL_BADGES.find((badge) => badge.id === badgeId);

    return {
      id: badgeId,
      name: badgeDefinition?.name || profileBadge?.name || badgeId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      description: badgeDefinition?.description || profileBadge?.description || "Freigeschaltet",
      iconKey: badgeDefinition?.icon || profileBadge?.iconKey || "trophy",
    };
  });

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00F5FF]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#2FF801]/5 blur-[120px] rounded-full" />
      </div>

      <header className="px-6 pt-12 pb-4 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">
              Profil
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {isCannalogAdmin && (
              <Link
                href="/admin"
                aria-label="Admin Dashboard"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#F39C12]/30 bg-[#F39C12]/10 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#F39C12] transition-all hover:border-[#F39C12]/60 hover:bg-[#F39C12]/15"
              >
                <Shield size={14} />
                Admin
              </Link>
            )}
            <NotificationBell />
            <ThemeToggle />
            <Link href="/profile/settings">
              <button className="w-10 h-10 rounded-xl bg-[var(--card)] border border-[var(--border)]/50 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[#00F5FF] hover:border-[#00F5FF]/50 transition-all">
                <Settings size={18} />
              </button>
            </Link>
          </div>
        </div>

        {/* Owner Badge */}
        {isCannalogAdmin && (
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#F39C12]/30 bg-[#F39C12]/10 px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#F39C12]">
              <Shield size={12} /> CannaLog Owner
            </span>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-[var(--card)] rounded-[2rem] p-5 border border-[var(--border)]/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00F5FF]/5 via-transparent to-[#2FF801]/5 pointer-events-none" />

          <div className="flex items-start gap-5 relative z-10">
            {/* Avatar */}
            <AvatarUpload
              currentAvatarUrl={identity.avatarUrl}
              username={identity.username.replace("@", "")}
              displayName={identity.displayName}
              size="lg"
              onUploadComplete={() => refetchProfile()}
            />

            {/* Info */}
            <div className="flex-1 pt-1">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button onClick={() => setFollowersModal({ isOpen: true, mode: "followers" })} className="text-center px-1">
                  <p className="text-xl font-black text-[#00F5FF] font-display">{stats.followers}</p>
                  <p className="text-[7px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mt-0.5">Follower</p>
                </button>
                <button onClick={() => setFollowersModal({ isOpen: true, mode: "following" })} className="text-center px-1 border-x border-[var(--border)]/30">
                  <p className="text-xl font-black text-[#2FF801] font-display">{stats.following}</p>
                  <p className="text-[7px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mt-0.5">Following</p>
                </button>
                <Link href="/collection" className="text-center px-1">
                  <p className="text-xl font-black text-[var(--foreground)] font-display">{stats.totalStrains}</p>
                  <p className="text-[7px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mt-0.5">Strains</p>
                </Link>
              </div>

              {/* Edit button */}
              {isEditing ? (
                <div className="flex gap-2">
                  <button onClick={handleSaveProfile} disabled={isSaving} className="flex-1 py-2 bg-gradient-to-r from-[#00F5FF] to-[#00e5ee] text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1">
                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <><Check size={12} /> Save</>}
                  </button>
                  <button onClick={() => setIsEditing(false)} className="w-10 py-2 bg-[var(--muted)] border border-[var(--border)]/50 rounded-xl flex items-center justify-center text-[var(--muted-foreground)]">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsEditing(true)} className="w-full py-2 bg-[var(--muted)] border border-[var(--border)]/50 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-[#00F5FF]/50 transition-all">
                  Profil bearbeiten
                </button>
              )}
            </div>
          </div>

          {/* Name & Bio */}
          <div className="mt-5 space-y-2 relative z-10">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  value={editData.displayName}
                  onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                  placeholder="Anzeigename"
                  className="w-full bg-[var(--input)] border border-[var(--border)]/50 rounded-xl px-4 py-2 text-sm font-bold text-[var(--foreground)] placeholder:text-[#484849] focus:border-[#00F5FF]/50 outline-none"
                />
                <textarea
                  value={editData.bio}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  placeholder="Deine Bio..."
                  rows={2}
                  className="w-full bg-[var(--input)] border border-[var(--border)]/50 rounded-xl px-4 py-2 text-xs text-[var(--muted-foreground)] placeholder:text-[#484849] focus:border-[#00F5FF]/50 outline-none resize-none"
                />
              </div>
            ) : (
              <>
                <h2 className="text-xl font-black uppercase tracking-tight font-display text-[var(--foreground)]">{identity.displayName}</h2>
                <p className="text-xs text-[#2FF801] font-semibold tracking-widest">{identity.username}</p>
                {identity.bio && <p className="text-sm text-[var(--muted-foreground)] mt-2 leading-relaxed">{identity.bio}</p>}
              </>
            )}
          </div>

          {/* Meta row */}
          <div className="mt-4 flex items-center justify-between text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider relative z-10">
            <span className="flex items-center gap-1"><Calendar size={12} /> Member seit März 2026</span>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-8">
        {/* Community Section */}
        <section>
          <SectionHeader eyebrow="" title="Community" />
          <div className="mt-4">
            <OrganizationSwitcher />
          </div>
        </section>

        {/* Badges Section */}
        <section className="relative z-20 isolate">
          <div className="flex justify-between items-end mb-4">
            <SectionHeader eyebrow="" title="Abzeichen" />
            <button
              onClick={() => setShowBadgeShowcase(true)}
              className="text-[10px] font-bold text-[#00F5FF] hover:text-[#2FF801] transition-colors"
            >
              Alle
            </button>
          </div>
          {displayedBadges.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {displayedBadges.map((badge) => {
                const Icon = resolveBadgeIcon(badge.iconKey);

                return (
                  <div
                    key={badge.id}
                    className="rounded-2xl border border-[#2FF801]/30 bg-[var(--card)] p-4 flex flex-col items-center text-center gap-2 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-1 bg-[#2FF801]/10 text-[#ffd76a]">
                      <Icon size={28} />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-tight leading-none text-[var(--foreground)]">
                      {badge.name}
                    </p>
                    <p className="text-[8px] font-semibold uppercase tracking-tighter text-[#2FF801]">
                      {badge.description}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--border)]/50 bg-[var(--card)] py-10 text-center text-xs font-bold uppercase tracking-widest text-[#484849]">
              Noch keine Abzeichen freigeschaltet
            </div>
          )}
        </section>

        {/* Favorites Section */}
        <section className="space-y-4 overflow-hidden isolate relative z-10">
          <div className="flex items-center justify-between px-1">
            <SectionHeader eyebrow="" title="Favorites" icon={Heart} iconColor="text-red-400" />
            {savingOrder && <Loader2 size={12} className="animate-spin text-[var(--muted-foreground)]" />}
          </div>
          {carouselFavorites.length > 0 ? (
            <div className="relative overflow-hidden isolate">
              {carouselFavorites.length > 1 && selectedFavoriteIndex !== null && (
                <div className="flex justify-center gap-2 mb-3">
                  <button
                    onClick={() => {
                      if (selectedFavoriteIndex > 0) {
                        handleReorder(selectedFavoriteIndex, selectedFavoriteIndex - 1);
                        setSelectedFavoriteIndex(selectedFavoriteIndex - 1);
                      }
                    }}
                    disabled={selectedFavoriteIndex === 0}
                    className="px-4 py-2 bg-[var(--card)] border border-[var(--border)]/50 rounded-full text-[var(--muted-foreground)] hover:border-[#00F5FF]/50 disabled:opacity-30 transition-all flex items-center gap-1 text-xs font-semibold"
                  >
                    <ArrowLeft size={14} /> Links
                  </button>
                  <button
                    onClick={() => {
                      if (selectedFavoriteIndex < carouselFavorites.length - 1) {
                        handleReorder(selectedFavoriteIndex, selectedFavoriteIndex + 1);
                        setSelectedFavoriteIndex(selectedFavoriteIndex + 1);
                      }
                    }}
                    disabled={selectedFavoriteIndex === carouselFavorites.length - 1}
                    className="px-4 py-2 bg-[var(--card)] border border-[var(--border)]/50 rounded-full text-[var(--muted-foreground)] hover:border-[#00F5FF]/50 disabled:opacity-30 transition-all flex items-center gap-1 text-xs font-semibold"
                  >
                    Rechts <ArrowRight size={14} />
                  </button>
                </div>
              )}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={carouselFavorites.map((f) => f.relationId)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                    {carouselFavorites.map((favorite, index) => (
                      <SortableFavoriteCard
                        key={`${favorite.relationId}-${index}`}
                        favorite={favorite}
                        isSelected={selectedFavoriteIndex === index}
                        onClick={() => setSelectedFavoriteIndex(selectedFavoriteIndex === index ? null : index)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {selectedFavoriteIndex === null && carouselFavorites.length > 1 && (
                <p className="text-center text-[10px] text-[#484849] mt-2">Klicke auf einen Strain um ihn auszuwählen</p>
              )}
            </div>
          ) : (
            <div className="py-10 text-center bg-[var(--card)] rounded-[2rem] border border-dashed border-[var(--border)]/50 text-[#484849] text-xs font-bold uppercase tracking-widest">Keine Favoriten gesetzt</div>
          )}
        </section>

        <section className="space-y-3">
          <PublicProfilePreviewCard
            profile={profileData}
            disabled={isSavingPublicPreferences || isSavingProfileVisibility}
            onVisibilityChange={handlePublicVisibilityChange}
            onPreferenceChange={handlePublicPreferenceChange}
          />
        </section>

        {/* Logout */}
        <section className="pb-10">
          <button
            onClick={() => signOut()}
            className="w-full py-4 bg-[#ff716c]/5 border border-[#ff716c]/20 rounded-2xl flex items-center justify-center gap-2 text-[#ff716c] text-xs font-black uppercase tracking-[0.2em] hover:bg-[#ff716c]/10 transition-all"
          >
            <LogOut size={16} /> Ausloggen
          </button>
        </section>
      </div>

      <FollowersListModal isOpen={followersModal.isOpen} onClose={() => setFollowersModal((prev) => ({ ...prev, isOpen: false }))} mode={followersModal.mode} userId={currentUserId} />
      <Suspense fallback={null}>
        <BadgeShowcase
          isOpen={showBadgeShowcase}
          userBadges={userBadges}
          featuredBadges={selectedBadges}
          onSelect={(badgeId) => setSelectedBadges(prev => prev.includes(badgeId) ? prev.filter(id => id !== badgeId) : [...prev, badgeId].slice(0, 4))}
          onSelectionChange={setSelectedBadges}
          onClose={() => setShowBadgeShowcase(false)}
        />
      </Suspense>
      <BottomNav />
    </main>
  );
}
