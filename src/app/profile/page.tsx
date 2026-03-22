"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  Camera,
  Eye,
  EyeOff,
  Globe2,
  Heart,
  Leaf,
  Loader2,
  Lock,
  LogOut,
  Shield,
  Sparkles,
  Sprout,
  Star,
  Trophy,
  UserRound,
  Wand2,
  Zap,
} from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import type {
  ProfileActivityItem,
  ProfileBadge,
  ProfileFavorite,
  ProfileIdentity,
  ProfileStats,
  ProfileViewModel,
  PublicProfilePreview,
  Strain,
} from "@/lib/types";

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

type ProfileRow = {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  profile_visibility?: "public" | "private" | null;
};

type FavoriteQueryRow = {
  favorite_rank?: number | null;
  strains?: {
    id?: string | null;
    name?: string | null;
    slug?: string | null;
    image_url?: string | null;
    type?: Strain["type"] | null;
    avg_thc?: number | null;
    thc_min?: number | null;
    thc_max?: number | null;
  } | null;
};

type BadgeQueryRow = {
  unlocked_at?: string | null;
  badges?: {
    id?: string | null;
    name?: string | null;
    description?: string | null;
    icon_url?: string | null;
    rarity?: string | null;
  } | null;
};

type Milestone = {
  title: string;
  description: string;
  progress: number;
};

function getBaseUsername(email: string | null | undefined) {
  if (!email) return "guest";
  return email.split("@")[0] || "guest";
}

function getInitials(value: string) {
  const cleaned = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return cleaned || "GL";
}

function formatThcDisplay(strain: FavoriteQueryRow["strains"]) {
  if (!strain) return "Keine Labordaten";
  if (typeof strain.avg_thc === "number") return `${strain.avg_thc}% THC`;
  if (typeof strain.thc_min === "number" && typeof strain.thc_max === "number") {
    return `${strain.thc_min}-${strain.thc_max}% THC`;
  }
  return "Keine Labordaten";
}

function createTagline(stats: ProfileStats, isDemoMode: boolean, hasUser: boolean) {
  if (isDemoMode) return "Kuratiertes Demo-Profil mit Collection-, Aktivitäts- und Privacy-Vorschau.";
  if (!hasUser) return "Baue dir ein ruhiges, hochwertiges Profil für Sammlung, Fortschritt und Public Preview auf.";
  if (stats.totalStrains === 0 && stats.totalGrows === 0) {
    return "Dein Profil ist bereit. Starte mit deinem ersten Strain oder dokumentiere direkt deinen ersten Grow.";
  }
  if (stats.totalGrows > 0) {
    return "Dein Profil verbindet Sammlung, Grow-Historie und öffentliche Identität in einer ruhigen Premium-Ansicht.";
  }
  return "Deine Collection und dein Profil wachsen zusammen zu einem persönlichen Premium-Dashboard.";
}

function buildPublicPreview(
  identity: ProfileIdentity,
  stats: ProfileStats,
  favorites: ProfileFavorite[],
  badges: ProfileBadge[]
): PublicProfilePreview {
  const isPublic = identity.profileVisibility === "public";

  return {
    title: isPublic ? "Öffentliche Profilvorschau aktiv" : "Privates Profil aktiv",
    description: isPublic
      ? "Andere sehen deinen Namen, ausgewählte Profilinfos, Fortschritt und kuratierte Highlights – sensible Details bleiben privat."
      : "Nur du siehst aktuell deine persönlichen Daten. Öffentliche Profilteile werden erst nach Freigabe sichtbar.",
    chips: [
      isPublic ? "Sichtbar für andere" : "Nur für dich sichtbar",
      `${stats.totalStrains} geloggte Strains`,
      `${favorites.length} Favoriten`,
      `${badges.length} Badges`,
    ],
  };
}

function buildActivity(
  identity: ProfileIdentity,
  stats: ProfileStats,
  favorites: ProfileFavorite[],
  badges: ProfileBadge[]
): ProfileActivityItem[] {
  const items: ProfileActivityItem[] = [
    {
      id: "collection",
      title: "Collection Fokus",
      detail:
        stats.totalStrains > 0
          ? `${stats.totalStrains} Strains dokumentiert und bereit für mehr Tiefe.`
          : "Deine Collection ist noch leer – der beste Startpunkt für Profilqualität.",
      value: stats.totalStrains > 0 ? `${stats.totalStrains} Einträge` : "Startklar",
      tone: stats.totalStrains > 0 ? "accent" : "neutral",
    },
    {
      id: "privacy",
      title: "Sichtbarkeit",
      detail:
        identity.profileVisibility === "public"
          ? "Dein öffentliches Profil ist aktiviert und teilt nur kuratierte Highlights."
          : "Aktuell privat – ideal, solange du dein Profil noch aufbaust.",
      value: identity.profileVisibility === "public" ? "Public" : "Private",
      tone: identity.profileVisibility === "public" ? "success" : "neutral",
    },
    {
      id: "curation",
      title: "Kuratierte Favoriten",
      detail:
        favorites.length > 0
          ? `Top-Highlights vorhanden – deine Sammlung wirkt bereits bewusst kuratiert.`
          : "Noch keine Favoriten gesetzt – ideal für einen hochwertigen ersten Eindruck.",
      value: favorites.length > 0 ? `${favorites.length} Favoriten` : "Fehlt noch",
      tone: favorites.length > 0 ? "accent" : "neutral",
    },
  ];

  if (badges.length > 0) {
    items.push({
      id: "badges",
      title: "Fortschritt",
      detail: `Du hast bereits ${badges.length} Badge${badges.length > 1 ? "s" : ""} freigeschaltet – sichtbar als Social Proof.`,
      value: `${badges.length} Badges`,
      tone: "success",
    });
  }

  if (stats.totalGrows > 0) {
    items.push({
      id: "grows",
      title: "Grow Aktivität",
      detail: `${stats.totalGrows} Grow${stats.totalGrows > 1 ? "s" : ""} geben deinem Profil echte Historie und Kontext.`,
      value: `${stats.totalGrows} Grows`,
      tone: "accent",
    });
  }

  return items.slice(0, 4);
}

function getNextMilestone(stats: ProfileStats): Milestone {
  if (stats.totalStrains < 1) {
    return {
      title: "Ersten Strain loggen",
      description: "Lege den Grundstein für Collection, Aktivität und Profilwertigkeit.",
      progress: 0,
    };
  }

  if (stats.totalStrains < 5) {
    return {
      title: "5 Strains vollständig dokumentieren",
      description: "Mit fünf Einträgen wirkt dein Profil bereits kuratiert und substanziell.",
      progress: Math.round((stats.totalStrains / 5) * 100),
    };
  }

  if (stats.totalGrows < 1) {
    return {
      title: "Ersten Grow ergänzen",
      description: "Grows geben deinem Profil Tiefe und machen Aktivität sichtbar.",
      progress: 65,
    };
  }

  if (stats.favoriteCount < 3) {
    return {
      title: "Top-Favoriten kuratieren",
      description: "Eine klare Favoritenliste macht dein Profil persönlicher und hochwertiger.",
      progress: Math.round((stats.favoriteCount / 3) * 100),
    };
  }

  return {
    title: "Öffentliches Profil veredeln",
    description: "Feinschliff bei Privacy, Badges und Collection Highlights für eine starke Social-Präsenz.",
    progress: Math.min(100, 72 + stats.unlockedBadgeCount * 6),
  };
}

function resolveBadgeIcon(iconKey: string) {
  const normalized = iconKey.toLowerCase();
  const matchedKey = Object.keys(BADGE_ICONS).find((key) => normalized.includes(key));
  return matchedKey ? BADGE_ICONS[matchedKey] : Star;
}

function createFallbackViewModel(isDemoMode: boolean): ProfileViewModel {
  const stats: ProfileStats = isDemoMode
    ? {
      totalStrains: 12,
      totalGrows: 3,
      favoriteCount: 3,
      unlockedBadgeCount: 2,
      xp: 1140,
      level: 5,
      progressToNextLevel: 50,
    }
    : {
      totalStrains: 0,
      totalGrows: 0,
      favoriteCount: 0,
      unlockedBadgeCount: 0,
      xp: 0,
      level: 1,
      progressToNextLevel: 0,
    };

  const favorites: ProfileFavorite[] = isDemoMode
    ? [
      {
        id: "demo-godfather-og",
        name: "Godfather OG",
        slug: "godfather-og",
        imageUrl: "/strains/godfather-og.jpg",
        type: "indica",
        thcDisplay: "27% THC",
        favoriteRank: 1,
      },
      {
        id: "demo-animal-face",
        name: "Animal Face",
        slug: "animal-face",
        imageUrl: "/strains/animal-face.jpg",
        type: "hybrid",
        thcDisplay: "24% THC",
        favoriteRank: 2,
      },
      {
        id: "demo-jack-herer",
        name: "Jack Herer",
        slug: "jack-herer",
        imageUrl: "/strains/jack-herer.jpg",
        type: "sativa",
        thcDisplay: "22% THC",
        favoriteRank: 3,
      },
    ]
    : [];

  const badges: ProfileBadge[] = isDemoMode
    ? [
      {
        id: "starter",
        name: "Starter",
        description: "Ersten Strain in der Collection gespeichert.",
        iconKey: "starter",
        rarity: "common",
      },
      {
        id: "connoisseur",
        name: "Connoisseur",
        description: "Fünf Strains bewertet und dein Profil sichtbar vertieft.",
        iconKey: "connoisseur",
        rarity: "uncommon",
      },
    ]
    : [];

  const identity: ProfileIdentity = {
    email: isDemoMode ? "demo@cannalog.app" : null,
    username: isDemoMode ? "@demo-curator" : "@guest",
    displayName: isDemoMode ? "Demo Curator" : "Guest",
    initials: isDemoMode ? "DC" : "GU",
    profileVisibility: isDemoMode ? "public" : "private",
    tagline: createTagline(stats, isDemoMode, false),
  };

  return {
    identity,
    stats,
    favorites,
    badges,
    activity: buildActivity(identity, stats, favorites, badges),
    preview: buildPublicPreview(identity, stats, favorites, badges),
  };
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1 px-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#00F5FF]/70">{eyebrow}</p>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
        <p className="max-w-xl text-sm leading-6 text-white/45">{description}</p>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <main className="min-h-screen bg-[#0a0c0d] text-white pb-32">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-5 py-6 animate-pulse sm:px-6">
        <div className="h-6 w-32 rounded-full bg-white/8" />
        <div className="h-72 rounded-[2rem] border border-white/8 bg-white/[0.03]" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-24 rounded-3xl border border-white/8 bg-white/[0.03]" />
          ))}
        </div>
        <div className="h-52 rounded-[2rem] border border-white/8 bg-white/[0.03]" />
        <div className="h-44 rounded-[2rem] border border-white/8 bg-white/[0.03]" />
      </div>
      <BottomNav />
    </main>
  );
}

export default function ProfilePage() {
  const { user, signOut, loading, isDemoMode, setDemoMode } = useAuth();
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [viewModel, setViewModel] = useState<ProfileViewModel>(() => createFallbackViewModel(false));
  const [pageState, setPageState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (loading) {
      setPageState("loading");
      return;
    }

    let cancelled = false;

    async function fetchProfile() {
      setPageState("loading");
      setErrorMessage(null);

      if (isDemoMode) {
        if (!cancelled) {
          setViewModel(createFallbackViewModel(true));
          setPageState("ready");
        }
        return;
      }

      if (!user) {
        if (!cancelled) {
          setViewModel(createFallbackViewModel(false));
          setPageState("ready");
        }
        return;
      }

      try {
        const [profileResult, favoritesResult, badgesResult, strainCountResult, growCountResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("username, display_name, avatar_url, profile_visibility")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("user_strain_relations")
            .select("favorite_rank, strains(id, name, slug, image_url, type, avg_thc, thc_min, thc_max)")
            .eq("user_id", user.id)
            .eq("is_favorite", true)
            .order("favorite_rank", { ascending: true })
            .limit(5),
          supabase
            .from("user_badges")
            .select("unlocked_at, badges(id, name, description, icon_url, rarity)")
            .eq("user_id", user.id)
            .order("unlocked_at", { ascending: false }),
          supabase.from("ratings").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("grows").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (favoritesResult.error) throw favoritesResult.error;
        if (badgesResult.error) throw badgesResult.error;
        if (strainCountResult.error) throw strainCountResult.error;
        if (growCountResult.error) throw growCountResult.error;

        const favoriteItems: ProfileFavorite[] = ((favoritesResult.data ?? []) as FavoriteQueryRow[])
          .map((entry) => {
            const strain = entry.strains;
            if (!strain?.id || !strain.name || !strain.slug) return null;

            return {
              id: strain.id,
              name: strain.name,
              slug: strain.slug,
              imageUrl: strain.image_url ?? null,
              type: strain.type ?? null,
              thcDisplay: formatThcDisplay(strain),
              favoriteRank: entry.favorite_rank ?? null,
            };
          })
          .filter((entry): entry is ProfileFavorite => Boolean(entry));

        const badgeItems: ProfileBadge[] = ((badgesResult.data ?? []) as BadgeQueryRow[])
          .reduce<ProfileBadge[]>((acc, entry) => {
            const badge = entry.badges;
            if (!badge?.id || !badge.name) {
              return acc;
            }

            acc.push({
              id: badge.id,
              name: badge.name,
              description: badge.description ?? "Fortschritt im Profil freigeschaltet.",
              iconKey: badge.icon_url ?? badge.name,
              rarity: badge.rarity ?? "common",
              unlockedAt: entry.unlocked_at ?? undefined,
            });

            return acc;
          }, []);

        const stats: ProfileStats = {
          totalStrains: strainCountResult.count ?? 0,
          totalGrows: growCountResult.count ?? 0,
          favoriteCount: favoriteItems.length,
          unlockedBadgeCount: badgeItems.length,
          xp:
            (strainCountResult.count ?? 0) * 60 +
            (growCountResult.count ?? 0) * 120 +
            favoriteItems.length * 25 +
            badgeItems.length * 40,
          level:
            Math.max(
              1,
              Math.floor(
                ((strainCountResult.count ?? 0) * 60 +
                  (growCountResult.count ?? 0) * 120 +
                  favoriteItems.length * 25 +
                  badgeItems.length * 40) / 120
              ) + 1
            ),
          progressToNextLevel:
            Math.round(
              ((((strainCountResult.count ?? 0) * 60 +
                (growCountResult.count ?? 0) * 120 +
                favoriteItems.length * 25 +
                badgeItems.length * 40) % 120) /
                120) *
              100
            ),
        };

        const profile = (profileResult.data ?? null) as ProfileRow | null;
        const displayName =
          profile?.display_name?.trim() || profile?.username?.trim() || getBaseUsername(user.email) || "Guest";
        const username = profile?.username?.trim() || getBaseUsername(user.email);

        const identity: ProfileIdentity = {
          email: user.email ?? null,
          username: `@${username.replace(/^@+/, "")}`,
          displayName,
          initials: getInitials(displayName),
          avatarUrl: profile?.avatar_url?.trim() || null,
          profileVisibility: profile?.profile_visibility === "public" ? "public" : "private",
          tagline: createTagline(stats, false, true),
        };

        const nextViewModel: ProfileViewModel = {
          identity,
          stats,
          favorites: favoriteItems,
          badges: badgeItems,
          activity: buildActivity(identity, stats, favoriteItems, badgeItems),
          preview: buildPublicPreview(identity, stats, favoriteItems, badgeItems),
        };

        if (!cancelled) {
          setViewModel(nextViewModel);
          setPageState("ready");
        }
      } catch (error) {
        console.error("Profile loading error:", error);
        if (!cancelled) {
          setViewModel(createFallbackViewModel(false));
          setErrorMessage("Das Profil konnte gerade nicht vollständig geladen werden. Die Seite zeigt eine sichere Fallback-Ansicht.");
          setPageState("error");
        }
      }
    }

    void fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [isDemoMode, loading, user]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const handleToggleVisibility = async () => {
    if (!user || isDemoMode || isUpdatingVisibility) {
      if (!user && !isDemoMode) {
        setStatusMessage("Melde dich an, um ein öffentliches Profil freizuschalten.");
      }
      return;
    }

    const previousViewModel = viewModel;
    const nextVisibility = viewModel.identity.profileVisibility === "public" ? "private" : "public";
    const nextIdentity: ProfileIdentity = {
      ...viewModel.identity,
      profileVisibility: nextVisibility,
    };

    const nextViewModel: ProfileViewModel = {
      ...viewModel,
      identity: nextIdentity,
      activity: buildActivity(nextIdentity, viewModel.stats, viewModel.favorites, viewModel.badges),
      preview: buildPublicPreview(nextIdentity, viewModel.stats, viewModel.favorites, viewModel.badges),
    };

    setViewModel(nextViewModel);
    setIsUpdatingVisibility(true);
    setStatusMessage(nextVisibility === "public" ? "Öffentliche Profilansicht aktiviert." : "Profil wieder auf privat gesetzt.");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ profile_visibility: nextVisibility })
        .eq("id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Visibility error:", error);
      setViewModel(previousViewModel);
      setStatusMessage("Die Sichtbarkeit konnte nicht gespeichert werden.");
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const handleDemoToggle = () => {
    const nextMode = !isDemoMode;
    setDemoMode(nextMode);
    setStatusMessage(nextMode ? "Vorschaumodus aktiviert." : "Vorschaumodus deaktiviert.");
  };

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !user || isDemoMode) {
      return;
    }

    setIsUploadingAvatar(true);
    setStatusMessage(null);

    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("strains").upload(filePath, file, {
        upsert: true,
      });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("strains").getPublicUrl(filePath);

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            username: viewModel.identity.username.replace(/^@+/, "") || getBaseUsername(user.email),
            display_name: viewModel.identity.displayName,
            avatar_url: publicUrl,
          },
          { onConflict: "id" }
        );

      if (profileError) throw profileError;

      setViewModel((current) => ({
        ...current,
        identity: {
          ...current.identity,
          avatarUrl: publicUrl,
        },
      }));
      setStatusMessage("Profilbild aktualisiert.");
    } catch (error) {
      console.error("Avatar upload error:", error);
      setStatusMessage("Das Profilbild konnte nicht gespeichert werden.");
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  };

  if (pageState === "loading") {
    return <ProfileSkeleton />;
  }

  const { identity, stats, favorites, badges, activity, preview } = viewModel;
  const nextMilestone = getNextMilestone(stats);
  const progressWidth = Math.max(stats.progressToNextLevel, stats.xp > 0 ? 8 : 0);
  const isPublic = identity.profileVisibility === "public";
  const primaryCtaHref = user ? "/strains" : "/login";
  const primaryCtaLabel = user ? "Collection erweitern" : "Anmelden";

  return (
    <main className="min-h-screen bg-[#355E3B] text-white pb-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%),radial-gradient(circle_at_top_right,rgba(122,168,116,0.14),transparent_28%)]" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#00F5FF]/80">Cannalog</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Profil</h1>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-white/60">
            {isDemoMode ? "Preview Mode" : isPublic ? "Public Profile" : "Private Profile"}
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {errorMessage}
          </div>
        )}

        {statusMessage && (
          <div className="rounded-2xl border border-[#00F5FF]/15 bg-[#00F5FF]/10 px-4 py-3 text-sm text-[#b9fbff]">
            {statusMessage}
          </div>
        )}

        <Card className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-0 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-8 p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[#00F5FF]/20 blur-3xl" />
                  <Avatar className="relative h-24 w-24 border border-white/15 bg-[#101214] p-1 sm:h-28 sm:w-28">
                    <AvatarImage
                      src={identity.avatarUrl || `https://api.dicebear.com/7.x/thumbs/svg?seed=${user?.email || identity.username || "guest"}`}
                    />
                    <AvatarFallback className="bg-[#101214] text-lg font-semibold text-white/80">
                      {identity.initials}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileImageUpload}
                  />
                  {user && !isDemoMode && (
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute -top-1 -right-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#101214]/90 text-white/75 shadow-lg transition-colors hover:border-[#00F5FF]/35 hover:text-[#00F5FF] disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Profilbild ändern"
                      title="Profilbild ändern"
                    >
                      {isUploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                    </button>
                  )}
                  <div className="absolute -bottom-2 right-0 rounded-full border border-black/40 bg-[#00F5FF] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black shadow-lg shadow-[#00F5FF]/25">
                    Lvl {stats.level}
                  </div>
                </div>

                <div className="max-w-xl space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/55">
                      {identity.username}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${isPublic
                        ? "border border-[#2FF801]/30 bg-[#2FF801]/10 text-[#baff9a]"
                        : "border border-white/10 bg-white/[0.04] text-white/60"
                        }`}
                    >
                      {isPublic ? <Globe2 size={12} /> : <Lock size={12} />}
                      {isPublic ? "Öffentlich" : "Privat"}
                    </span>
                    {isDemoMode && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#00F5FF]/25 bg-[#00F5FF]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b9fbff]">
                        <Wand2 size={12} /> Demo
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{identity.displayName}</h2>
                    <p className="max-w-2xl text-sm leading-7 text-white/55 sm:text-[15px]">{identity.tagline}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-white/45">
                    <span className="inline-flex items-center gap-2">
                      <UserRound size={14} className="text-white/35" />
                      {identity.email ?? "Noch nicht angemeldet"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Sparkles size={14} className="text-white/35" />
                      {stats.xp} XP gesammelt
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:min-w-[220px]">
                <button
                  onClick={handleToggleVisibility}
                  disabled={!user || isDemoMode || isUpdatingVisibility}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${user && !isDemoMode
                    ? "border-white/10 bg-white/[0.03] hover:border-[#00F5FF]/35 hover:bg-[#00F5FF]/8"
                    : "cursor-not-allowed border-white/8 bg-white/[0.02] opacity-70"
                    }`}
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">Profilsichtbarkeit</p>
                    <p className="mt-1 text-sm text-white/45">{isPublic ? "Öffentlich" : "Privat"}</p>
                  </div>
                  <div className={`rounded-full p-2 ${isPublic ? "bg-[#2FF801]/12 text-[#9eff7d]" : "bg-white/5 text-white/50"}`}>
                    {isPublic ? <Eye size={18} /> : <EyeOff size={18} />}
                  </div>
                </button>

                <div className="flex gap-3">
                  <Link
                    href={primaryCtaHref}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5"
                  >
                    {primaryCtaLabel}
                    <ArrowRight size={16} />
                  </Link>
                  {user ? (
                    <button
                      onClick={handleSignOut}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/75 transition-colors hover:bg-white/[0.06]"
                    >
                      <LogOut size={16} />
                    </button>
                  ) : (
                    <Link
                      href="/strains"
                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/75 transition-colors hover:bg-white/[0.06]"
                    >
                      <Leaf size={16} />
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-[1.5rem] border border-white/8 bg-black/20 p-4 sm:p-5">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.25em] text-white/45">
                <span>Level Fortschritt</span>
                <span>{stats.progressToNextLevel}% bis Level {stats.level + 1}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/6">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#00F5FF,#2FF801)] transition-all duration-700"
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Overview"
            title="Das Wesentliche auf einen Blick"
            description="Eine ruhige Zusammenfassung deiner Sammlung, Aktivität und Profilsubstanz – ohne Dev-Lärm und ohne leere Utility-Flächen."
          />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Strains", value: stats.totalStrains.toString(), icon: Leaf },
              { label: "Grows", value: stats.totalGrows.toString(), icon: Sprout },
              { label: "Favoriten", value: stats.favoriteCount.toString(), icon: Heart },
              { label: "Badges", value: stats.unlockedBadgeCount.toString(), icon: Trophy },
            ].map((item) => (
              <Card key={item.label} className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40">{item.label}</p>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{item.value}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-white/60">
                    <item.icon size={18} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Collection"
            title="Kuratierte Highlights"
            description="Favoriten und Sammlungshighlights verleihen deinem Profil Persönlichkeit und machen sofort sichtbar, wofür du stehst."
          />

          {favorites.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {favorites.map((favorite) => (
                <Link key={favorite.id} href={`/strains/${favorite.slug}`} className="min-w-[250px] max-w-[250px] flex-shrink-0">
                  <Card className="h-full overflow-hidden rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-0 transition-all hover:-translate-y-1 hover:border-white/15">
                    <div className="relative h-48 w-full overflow-hidden">
                      {favorite.imageUrl ? (
                        <Image
                          src={favorite.imageUrl}
                          alt={favorite.name}
                          fill
                          className="object-cover transition-transform duration-500 hover:scale-105"
                          sizes="250px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-white/[0.04] text-white/30">
                          <Leaf size={24} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c0d] via-[#0a0c0d]/25 to-transparent" />
                      <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
                        <span className="rounded-full border border-white/12 bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                          {favorite.type ?? "curated"}
                        </span>
                        {favorite.favoriteRank && (
                          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-black">
                            Top {favorite.favoriteRank}
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 space-y-2">
                        <p className="text-lg font-semibold tracking-tight text-white">{favorite.name}</p>
                        <div className="flex items-center justify-between text-xs text-white/65">
                          <span>{favorite.thcDisplay}</span>
                          <span className="inline-flex items-center gap-1">
                            Details <ArrowRight size={14} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.025] p-6 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-xl space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">Noch keine Favoriten</p>
                  <h3 className="text-xl font-semibold tracking-tight text-white">Mach deine Collection sichtbar</h3>
                  <p className="text-sm leading-6 text-white/45">
                    Sobald du Favoriten markierst, entsteht hier eine kuratierte Front deiner Sammlung – ideal für Identität und Public Preview.
                  </p>
                </div>
                <Link
                  href="/strains"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5"
                >
                  Zum Katalog
                  <ArrowRight size={16} />
                </Link>
              </div>
            </Card>
          )}
        </section>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Activity"
            title="Aktivität und Momentum"
            description="Statt leerer Flächen zeigt dein Profil, wie weit du schon bist und welche nächste Aktion den größten Qualitätsgewinn bringt."
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {activity.map((item) => (
              <Card key={item.id} className="rounded-[1.7rem] border border-white/8 bg-white/[0.03] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/40">{item.title}</p>
                    <p className="text-base font-semibold tracking-tight text-white">{item.value}</p>
                    <p className="text-sm leading-6 text-white/45">{item.detail}</p>
                  </div>
                  <div
                    className={`rounded-2xl p-3 ${item.tone === "success"
                      ? "bg-[#2FF801]/12 text-[#afff94]"
                      : item.tone === "accent"
                        ? "bg-[#00F5FF]/10 text-[#9ff9ff]"
                        : "bg-white/[0.05] text-white/55"
                      }`}
                  >
                    <Activity size={18} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-4">
            <SectionHeader
              eyebrow="Progress"
              title="Badges und nächste Milestones"
              description="Gamification bleibt bewusst reduziert: sichtbar, motivierend und sauber eingebettet in den Premium-Look des Profils."
            />

            {badges.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {badges.slice(0, 4).map((badge) => {
                  const BadgeIcon = resolveBadgeIcon(badge.iconKey);
                  return (
                    <Card key={badge.id} className="rounded-[1.7rem] border border-white/8 bg-white/[0.03] p-5">
                      <div className="flex items-start gap-4">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-[#ffd76a]">
                          <BadgeIcon size={18} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold tracking-tight text-white">{badge.name}</p>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                              {badge.rarity}
                            </span>
                          </div>
                          <p className="text-sm leading-6 text-white/45">{badge.description}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.025] p-6 sm:p-8">
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">Noch keine Badges</p>
                  <h3 className="text-xl font-semibold tracking-tight text-white">Dein Fortschritt startet mit echter Aktivität</h3>
                  <p className="max-w-xl text-sm leading-6 text-white/45">
                    Sobald du Strains loggst, Favoriten kuratierst oder Grows dokumentierst, wird dieser Bereich zum sichtbaren Social Proof deines Profils.
                  </p>
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <SectionHeader
              eyebrow="Next"
              title="Nächster sinnvoller Schritt"
              description="Ein fokussierter Milestone verhindert, dass sich das Profil leer oder unfertig anfühlt."
            />
            <Card className="rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(0,245,255,0.10),rgba(255,255,255,0.02))] p-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#00F5FF]/20 bg-[#00F5FF]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b9fbff]">
                  <Sparkles size={12} /> Empfehlung
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold tracking-tight text-white">{nextMilestone.title}</h3>
                  <p className="text-sm leading-6 text-white/50">{nextMilestone.description}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
                    <span>Fortschritt</span>
                    <span>{nextMilestone.progress}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#00F5FF,#2FF801)]"
                      style={{ width: `${Math.max(6, nextMilestone.progress)}%` }}
                    />
                  </div>
                </div>
                <div className="grid gap-3 pt-2">
                  <Link
                    href="/strains"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5"
                  >
                    Strains entdecken
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/grows/new"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/75 transition-colors hover:bg-white/[0.06]"
                  >
                    Grow anlegen
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <SectionHeader
              eyebrow="Social"
              title="Public Preview & Privatsphäre"
              description="Die Sichtbarkeit bekommt einen echten Produktnutzen: Du siehst sofort, wie dein Profil nach außen wirken würde."
            />
            <Card className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6 sm:p-7">
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold tracking-tight text-white">Öffentliches Profil</h3>
                    <p className="max-w-2xl text-sm leading-6 text-white/48">So wirkt dein Profil für andere Nutzer.</p>
                  </div>
                  <div className={`rounded-2xl p-3 ${isPublic ? "bg-[#2FF801]/12 text-[#afff94]" : "bg-white/[0.05] text-white/55"}`}>
                    {isPublic ? <Globe2 size={18} /> : <Lock size={18} />}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {preview.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/65"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <SectionHeader
              eyebrow="Account"
              title="Profilmodus & Zugang"
              description="Ein kompakter Bereich für Vorschau, Sign-in und Sitzungsaktionen – ohne Testcenter oder Admin-Noise in der Hauptansicht."
            />
            <Card className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6">
              <div className="space-y-4">
                <button
                  onClick={handleDemoToggle}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${isDemoMode
                    ? "border-[#00F5FF]/25 bg-[#00F5FF]/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                    }`}
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">Vorschaumodus</p>
                    <p className="mt-1 text-sm text-white/45">
                      Schaltet beispielhafte Collection-, Activity- und Badge-Inhalte frei, ohne echte Nutzerdaten zu verändern.
                    </p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${isDemoMode ? "bg-[#00F5FF] text-black" : "bg-white/8 text-white/55"}`}>
                    {isDemoMode ? "Aktiv" : "Aus"}
                  </div>
                </button>

                {user ? (
                  <button
                    onClick={handleSignOut}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-100 transition-colors hover:bg-red-400/15"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5"
                  >
                    Einloggen für volles Profil
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            </Card>
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
