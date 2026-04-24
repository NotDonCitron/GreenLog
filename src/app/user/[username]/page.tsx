"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    Loader2,
    Calendar,
    ArrowLeft,
    Archive,
    Bug,
    Building2,
    Shield,
    Sprout,
    Trophy,
    Crown,
    FileText,
    Flame,
    Gem,
    Gift,
    Heart,
    Home,
    PenLine,
    Zap,
    Leaf,
    Sparkles,
    Users,
    Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { FollowButton } from "@/components/social/follow-button";
import { ActivityItem } from "@/components/social/activity-item";
import { useAuth } from "@/components/auth-provider";
import type { ProfileRow, PublicProfileRating, SanitizedPublicProfile } from "@/lib/types";

const BADGE_ICONS: Record<string, LucideIcon> = {
    starter: Sprout,
    archive: Archive,
    bug: Bug,
    building: Building2,
    connoisseur: Trophy,
    crown: Crown,
    "file-text": FileText,
    flame: Flame,
    gem: Gem,
    gift: Gift,
    heart: Heart,
    home: Home,
    highflyer: Zap,
    leaf: Leaf,
    dna: Sparkles,
    moon: Sparkles,
    pen: PenLine,
    shield: Shield,
    sun: Sparkles,
    grower: Leaf,
    social: Users,
    sparkles: Sparkles,
    trophy: Trophy,
    users: Users,
};

type PublicProfileTab = "activity" | "favorites" | "reviews";

function resolveBadgeIcon(iconKey: string) {
    const normalized = iconKey.toLowerCase();
    const matchedKey = Object.keys(BADGE_ICONS).find((key) => normalized.includes(key));
    return matchedKey ? BADGE_ICONS[matchedKey] : Trophy;
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
    });
}

function formatRelativeDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function getReviewLabel(rating: number) {
    return rating.toFixed(1).replace(/\.0$/, "");
}

export default function UserProfilePage() {
    const params = useParams();
    const username = params.username as string;
    const { user, loading: authLoading } = useAuth();

    const [profileData, setProfileData] = useState<SanitizedPublicProfile | null>(null);
    const [activeTab, setActiveTab] = useState<PublicProfileTab>("activity");
    const [showAllBadges, setShowAllBadges] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const profile = profileData?.profile ?? null;
    const isOwnProfile = user?.id === profile?.id;
    const displayName = profile?.display_name || profile?.username || "";
    const preferences = profileData?.preferences ?? null;
    const canShowBadges = Boolean(preferences?.show_badges);
    const canShowFavorites = Boolean(preferences?.show_favorites);
    const canShowReviews = Boolean(preferences?.show_reviews);
    const canShowActivity = Boolean(preferences?.show_activity_feed);
    const hasPublicTabs = canShowActivity || canShowFavorites || canShowReviews;
    const counts = profileData?.counts ?? { followers: 0, following: 0, ratings: 0 };
    const visibleCounts = {
        ...counts,
        ratings: canShowReviews ? counts.ratings : 0,
    };
    const badges = canShowBadges ? profileData?.badges ?? [] : [];
    const visibleBadges = showAllBadges ? badges : badges.slice(0, 4);
    const hasHiddenBadges = badges.length > 4;
    const favorites = canShowFavorites ? profileData?.favorites ?? [] : [];
    const reviews = canShowReviews ? profileData?.reviews ?? [] : [];
    const activities = canShowActivity ? profileData?.activities ?? [] : [];
    const activityUser: ProfileRow | null = profile
        ? {
            ...profile,
            profile_visibility: "public",
        }
        : null;

    useEffect(() => {
        if (!username) return;

        const controller = new AbortController();

        async function fetchPublicProfile() {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/public-profiles/${encodeURIComponent(username)}`, {
                    signal: controller.signal,
                });
                const payload: { data?: { profile?: SanitizedPublicProfile }; error?: { message?: string } } = await response.json();
                const publicProfile = payload.data?.profile;

                if (!response.ok || !publicProfile) {
                    throw new Error(payload.error?.message || "Profile not found");
                }

                setProfileData(publicProfile);
            } catch (err) {
                if ((err as Error).name === "AbortError") {
                    return;
                }

                console.error("Error fetching public profile:", err);
                setProfileData(null);
                setError("User not found");
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void fetchPublicProfile();

        return () => {
            controller.abort();
        };
    }, [username]);

    useEffect(() => {
        if (!profileData) return;
        if (activeTab === "activity" && canShowActivity) return;
        if (activeTab === "favorites" && canShowFavorites) return;
        if (activeTab === "reviews" && canShowReviews) return;

        if (canShowActivity) {
            setActiveTab("activity");
        } else if (canShowFavorites) {
            setActiveTab("favorites");
        } else if (canShowReviews) {
            setActiveTab("reviews");
        }
    }, [activeTab, canShowActivity, canShowFavorites, canShowReviews, profileData]);

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#00F5FF]" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">User Not Found</h1>
                <p className="text-[var(--muted-foreground)] mb-4">
                    Der Nutzername {username} existiert nicht oder das Profil ist privat.
                </p>
                <Link href="/">
                    <button className="px-6 py-3 bg-[var(--card)] text-[var(--foreground)] font-semibold rounded-xl border border-[var(--border)]/50">
                        <ArrowLeft className="h-4 w-4 inline mr-2" />
                        Go Home
                    </button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[var(--background)] pb-24">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
            </div>

            <div className="sticky top-0 z-20 w-full max-w-full glass-surface border-b border-[var(--border)]/50 backdrop-blur-md">
                <div className="mx-auto w-full max-w-lg px-4 py-4">
                    <div className="flex min-w-0 items-center gap-4">
                        <Link href="/discover" className="flex-shrink-0">
                            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--card)] border border-[var(--border)]/50">
                                <ArrowLeft className="h-5 w-5 text-[var(--foreground)]" />
                            </button>
                        </Link>
                        <div className="min-w-0 flex-1">
                            <h1 className="truncate text-lg font-bold text-[var(--foreground)]">
                                {displayName}
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto w-full max-w-lg px-4 py-6">
                {(profile.username === "fabian.gebert" || profile.username === "lars" || profile.username === "lars.fieber" || profile.username === "test" || profile.username === "pascal" || profile.username === "hintermaier.pascal" || profile.username === "pascal.hintermaier_81") && (
                    <div className="mb-6 flex justify-center">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#F39C12]/30 bg-[#F39C12]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F39C12]">
                            <Shield size={10} /> CannaLog Owner
                        </span>
                    </div>
                )}

                <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                        <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-[#00F5FF]/50 bg-[var(--card)] shadow-2xl backdrop-blur-md">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#00F5FF]/10 via-transparent to-[#2FF801]/10" />
                            {profile.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt={profile.display_name ?? profile.username ?? ""}
                                    className="relative z-10 h-full w-full object-cover"
                                />
                            ) : (
                                <span className="relative z-10 text-3xl font-black text-[#00F5FF] font-display">
                                    {profile.username?.[0]?.toUpperCase() || "?"}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 pt-2">
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="flex flex-col items-center justify-center bg-[var(--card)]/50 border border-[var(--border)]/30 rounded-2xl py-2 px-1 backdrop-blur-sm">
                                <p className="text-lg font-black text-[#00F5FF] tracking-tighter font-display leading-tight">{visibleCounts.followers}</p>
                                <p className="text-[7px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">Follower</p>
                            </div>
                            <div className="flex flex-col items-center justify-center bg-[var(--card)]/50 border border-[var(--border)]/30 rounded-2xl py-2 px-1 backdrop-blur-sm">
                                <p className="text-lg font-black text-[var(--foreground)] tracking-tighter font-display leading-tight">{visibleCounts.following}</p>
                                <p className="text-[7px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">Gefolgt</p>
                            </div>
                            <div className="flex flex-col items-center justify-center bg-[var(--card)]/50 border border-[var(--border)]/30 rounded-2xl py-2 px-1 backdrop-blur-sm">
                                <p className="text-lg font-black text-[#2FF801] tracking-tighter font-display leading-tight">{visibleCounts.ratings}</p>
                                <p className="text-[7px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">Bewertungen</p>
                            </div>
                        </div>

                        {!isOwnProfile && (
                            <FollowButton
                                userId={profile.id}
                                profileVisibility="public"
                                className="w-full justify-center py-2.5"
                            />
                        )}
                    </div>
                </div>

                <div className="mt-6 space-y-2">
                    <h2 className="text-2xl font-black tracking-tight text-[var(--foreground)] font-display uppercase italic">
                        {displayName}
                    </h2>

                    {profile.bio && (
                        <p className="mt-4 w-full break-words rounded-2xl border border-[var(--border)]/20 bg-[var(--card)]/30 p-4 text-sm leading-relaxed italic text-[var(--muted-foreground)] [overflow-wrap:anywhere]">
                            &ldquo;{profile.bio}&rdquo;
                        </p>
                    )}
                </div>

                <div className="mt-6 flex w-full min-w-0 flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]/60">
                    <span className="flex min-w-0 items-center gap-1.5 break-words [overflow-wrap:anywhere]">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-[#2FF801]" />
                        Joined {formatDate(profile.created_at)}
                    </span>
                </div>

                {badges.length > 0 && (
                    <section className="mt-10">
                        <div className="mb-4 flex items-center justify-between px-1">
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#00F5FF]">Abzeichen</p>
                            <span className="text-[9px] font-black uppercase text-[var(--muted-foreground)]">{badges.length} Unlocked</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {visibleBadges.map((badge) => {
                                const Icon = resolveBadgeIcon(badge.iconKey);

                                return (
                                    <div
                                        key={badge.id}
                                        className="flex flex-col items-center gap-2 rounded-2xl border border-[#2FF801]/30 bg-[var(--card)]/50 p-4 text-center backdrop-blur-sm transition-all"
                                    >
                                        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-[#2FF801]/10 text-[#ffd76a]">
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

                        {hasHiddenBadges && (
                            <button
                                type="button"
                                onClick={() => setShowAllBadges((current) => !current)}
                                className="mt-3 w-full rounded-lg border border-[#2FF801]/25 bg-[#2FF801]/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#2FF801] transition-colors hover:bg-[#2FF801]/15"
                            >
                                {showAllBadges ? "Weniger anzeigen" : `Alle ${badges.length} anzeigen`}
                            </button>
                        )}
                    </section>
                )}
            </div>

            <div className="mx-auto w-full max-w-lg px-4 relative z-10">
                {hasPublicTabs && (
                    <div className="w-full max-w-full overflow-x-auto border-b border-[var(--border)]/50 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <div className="flex w-max min-w-max gap-6 pr-4">
                            {canShowActivity && (
                                <button
                                    onClick={() => setActiveTab("activity")}
                                    className={`whitespace-nowrap pb-3 text-sm font-semibold transition-colors ${
                                        activeTab === "activity"
                                            ? "text-[#00F5FF] border-b-2 border-[#00F5FF]"
                                            : "text-[var(--muted-foreground)]"
                                    }`}
                                >
                                    Activity
                                </button>
                            )}
                            {canShowFavorites && (
                                <button
                                    onClick={() => setActiveTab("favorites")}
                                    className={`whitespace-nowrap pb-3 text-sm font-semibold transition-colors ${
                                        activeTab === "favorites"
                                            ? "text-[#00F5FF] border-b-2 border-[#00F5FF]"
                                            : "text-[var(--muted-foreground)]"
                                    }`}
                                >
                                    Favorites
                                </button>
                            )}
                            {canShowReviews && (
                                <button
                                    onClick={() => setActiveTab("reviews")}
                                    className={`whitespace-nowrap pb-3 text-sm font-semibold transition-colors ${
                                        activeTab === "reviews"
                                            ? "text-[#00F5FF] border-b-2 border-[#00F5FF]"
                                            : "text-[var(--muted-foreground)]"
                                    }`}
                                >
                                    Reviews
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="min-w-0 py-4">
                    {!hasPublicTabs && (
                        <div className="py-12 text-center">
                            <p className="text-sm text-[var(--muted-foreground)]">Keine öffentlichen Inhalte freigegeben</p>
                        </div>
                    )}

                    {canShowActivity && activeTab === "activity" && (
                        activities.length > 0 ? (
                            <div className="overflow-hidden rounded-2xl border border-[var(--border)]/50 bg-[var(--card)]">
                                {activities.map((activity) => (
                                    <ActivityItem
                                        key={activity.id}
                                        activity={activity}
                                        user={activityUser as ProfileRow}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <p className="text-sm text-[var(--muted-foreground)]">No recent activity</p>
                            </div>
                        )
                    )}

                    {canShowFavorites && activeTab === "favorites" && (
                        favorites.length > 0 ? (
                            <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
                                {favorites.map((fav) => (
                                    <Link key={fav.id} href={`/strains/${fav.slug}`} className="min-w-0">
                                        <div className="relative aspect-square overflow-hidden rounded-xl border border-[var(--border)]/50 bg-[var(--card)]">
                                            {fav.image_url && (
                                                <img
                                                    src={fav.image_url}
                                                    alt={fav.name}
                                                    className="absolute inset-0 h-full w-full object-cover"
                                                />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0f]/80 to-transparent" />
                                            <div className="absolute bottom-2 left-2 right-2">
                                                <p className="truncate text-xs font-semibold text-[var(--foreground)]">
                                                    {fav.name}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <p className="text-sm text-[var(--muted-foreground)]">No favorites yet</p>
                            </div>
                        )
                    )}

                    {canShowReviews && activeTab === "reviews" && (
                        reviews.length > 0 ? (
                            <div className="space-y-3">
                                {reviews.map((review: PublicProfileRating) => (
                                    <div key={review.id} className="rounded-2xl border border-[var(--border)]/50 bg-[var(--card)] p-4">
                                        <div className="flex items-start gap-3">
                                            <Link
                                                href={`/strains/${review.strain_slug}`}
                                                className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-[var(--border)]/50 bg-[var(--background)]"
                                            >
                                                <img
                                                    src={review.strain_image_url || "/strains/placeholder-1.svg"}
                                                    alt={review.strain_name}
                                                    className="h-full w-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0f]/35 to-transparent" />
                                            </Link>

                                            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00F5FF]">
                                                        Review
                                                    </p>
                                                    <Link href={`/strains/${review.strain_slug}`}>
                                                        <h3 className="truncate text-sm font-bold uppercase tracking-tight text-[var(--foreground)] transition-colors hover:text-[#00F5FF]">
                                                            {review.strain_name}
                                                        </h3>
                                                    </Link>
                                                </div>
                                                <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#2FF801]/30 bg-[#2FF801]/10 px-2.5 py-1 text-xs font-black text-[#2FF801]">
                                                    <Star className="h-3.5 w-3.5 fill-current" />
                                                    {getReviewLabel(review.overall_rating)}
                                                </div>
                                            </div>
                                        </div>

                                        {review.public_review_text && (
                                            <p className="mt-3 break-words rounded-xl border border-[var(--border)]/20 bg-[var(--background)]/50 p-3 text-sm leading-relaxed text-[var(--muted-foreground)] [overflow-wrap:anywhere]">
                                                {review.public_review_text}
                                            </p>
                                        )}

                                        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]/70">
                                            Öffentlich seit {formatRelativeDate(review.created_at)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <p className="text-sm text-[var(--muted-foreground)]">No public reviews yet</p>
                            </div>
                        )
                    )}
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
