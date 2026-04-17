"use client";

import { useState, useEffect, memo } from "react";
import Link from "next/link";
import { Leaf, Sprout, Star, Loader2, Trash2, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase/client";
import { Strain } from "@/lib/types";
import { formatPercent, getEffectDisplay, getTasteDisplay, getStrainTheme } from "@/lib/strain-display";

const TYPE_COLORS: Record<string, string> = {
  indica: "#8B5CF6",
  sativa: "#F59E0B",
  hybrid: "#10B981",
  ruderalis: "#6B7280",
};

interface FeedItem {
  id: string;
  organization_id: string;
  event_type: string;
  reference_id: string;
  user_id: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface FeedApiResponse {
  data: {
    feed: FeedItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  } | null;
  error: { message: string } | null;
}

interface CommunityFeedProps {
  organizationId: string;
  refreshKey?: number;
  isAdminOrGründer?: boolean;
  orgLogoUrl?: string | null;
}

const eventTypeConfig: Record<string, { icon: typeof Leaf; label: string; color: string }> = {
  strain_created: {
    icon: Leaf,
    label: "hat eine neue Sorte erstellt",
    color: "text-[#2FF801]",
  },
  grow_logged: {
    icon: Sprout,
    label: "hat einen neuen Grow protokolliert",
    color: "text-[#00F5FF]",
  },
  rating_added: {
    icon: Star,
    label: "hat eine Bewertung abgegeben",
    color: "text-yellow-400",
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Gerade eben";
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays < 7) return `vor ${diffDays} Tagen`;

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

const FeedItemCard = memo(function FeedItemCard({
  item,
  isAdminOrGründer,
  organizationId,
  orgLogoUrl,
  onDelete,
}: {
  item: FeedItem;
  isAdminOrGründer?: boolean;
  organizationId?: string;
  orgLogoUrl?: string | null;
  onDelete?: (feedId: string) => void;
}) {
  const config = eventTypeConfig[item.event_type] || {
    icon: Leaf,
    label: "hat etwas aktualisiert",
    color: "text-[var(--foreground)]/60",
  };
  const Icon = config.icon;

  const [strain, setStrain] = useState<Strain | null>(null);
  const [imgError, setImgError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (item.event_type === "strain_created" && item.reference_id) {
      setImgError(false);
      supabase
        .from("strains")
        .select("id, name, slug, type, image_url, avg_thc, thc_max, avg_cbd, cbd_max, farmer, manufacturer, brand, flavors, terpenes, effects, is_medical")
        .eq("id", item.reference_id)
        .single()
        .then(async ({ data: strainData }) => {
          if (!strainData) {
            setStrain(null);
            return;
          }
          // If strain has no image_url, check user_collection for user_image_url
          if (!strainData.image_url && item.user_id) {
            const { data: collectionData } = await supabase
              .from("user_collection")
              .select("user_image_url")
              .eq("strain_id", item.reference_id)
              .eq("user_id", item.user_id)
              .maybeSingle();
            if (collectionData?.user_image_url) {
              strainData.image_url = collectionData.user_image_url;
            }
          }
          setStrain(strainData);
        });
    }
  }, [item.event_type, item.reference_id, item.user_id]);

  const handleDelete = async () => {
    if (!organizationId || deleting) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `/api/communities/${organizationId}/feed?feedId=${item.id}`,
        {
          method: "DELETE",
          headers: {
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
        }
      );
      if (res.ok) {
        onDelete?.(item.id);
      }
    } finally {
      setDeleting(false);
    }
  };

  const displayName = item.user?.display_name || item.user?.username || "Unbekannter User";
  const avatarUrl = item.user?.avatar_url;

  // StrainCard-style display for strain_created events
  if (item.event_type === "strain_created") {
    const themeColor = strain ? (TYPE_COLORS[strain.type] || TYPE_COLORS.hybrid) : "#10B981";
    const thcDisplay = formatPercent((strain as any)?.avg_thc ?? strain?.thc_max, "—");
    const cbdDisplay = formatPercent((strain as any)?.avg_cbd ?? strain?.cbd_max, "< 1%");
    const tasteDisplay = strain ? getTasteDisplay(strain) : "—";
    const effectDisplay = strain ? getEffectDisplay(strain) : "—";
    const farmerDisplay = strain?.farmer?.trim() || strain?.manufacturer?.trim() || strain?.brand?.trim() || 'Unbekannter Farmer';

    // Build card content (same structure as StrainCard)
    const cardContent = (
      <div
        className="relative flex w-full min-w-0 flex-col rounded-[20px] border-2 bg-[#121212] transition-all duration-300 min-h-[240px]"
        style={{ borderColor: themeColor }}
      >
        {/* Farmer + Name — top section */}
        <div className="p-3 pb-1 min-w-0 relative z-10">
          <h2 className="text-[9px] font-bold tracking-[0.15em] uppercase text-[var(--foreground)]/30 truncate">
            {farmerDisplay}
          </h2>
          <p className="mt-0.5 title-font italic text-[13px] font-black leading-tight uppercase text-[var(--foreground)] break-words line-clamp-2">
            {strain?.name || "—"}
          </p>
        </div>

        {/* Image */}
        <div className="px-2 w-full relative z-10">
          <div className="relative w-full h-[80px] rounded-xl border border-white/5 shadow-lg overflow-hidden bg-[var(--card)]">
            {strain?.image_url && !imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={strain.image_url}
                alt={strain.name}
                className="w-full h-full object-contain"
                onError={() => setImgError(true)}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/strains/placeholder-1.svg"
                alt={strain?.name || ""}
                className="w-full h-full object-contain"
              />
            )}
            <div
              className="absolute bottom-1 left-1 border bg-black/80 backdrop-blur-md uppercase text-[6px] px-1 py-0.5 rounded-sm font-bold tracking-widest shadow-lg"
              style={{ borderColor: themeColor, color: themeColor }}
            >
              {strain?.type?.toUpperCase() || "HYBRID"}
            </div>
          </div>
        </div>

        {/* THC/Taste + CBD/Effect rows */}
        <div className="mt-2 px-3 w-full min-w-0 flex-col justify-start pb-3 relative z-10">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 shadow-inner backdrop-blur-sm">
            {/* Row 1: THC & Taste */}
            <div className="mb-2 grid min-w-0 grid-cols-2 gap-2 border-b border-white/5 pb-2">
              <div className="flex min-w-0 items-center gap-1">
                <span className="text-[7px] font-bold uppercase tracking-widest text-[var(--foreground)]/20">THC</span>
                <span className="text-[9px] font-black tracking-wide" style={{ color: themeColor }}>{thcDisplay}</span>
              </div>
              <div className="flex min-w-0 items-center justify-end border-l border-white/5 pl-2 text-right">
                <span className="text-[8px] font-medium tracking-wide text-[var(--foreground)]/80 leading-tight">{tasteDisplay}</span>
              </div>
            </div>
            {/* Row 2: CBD & Effect */}
            <div className="grid min-w-0 grid-cols-2 gap-2">
              <div className="flex min-w-0 items-center gap-1">
                <span className="text-[7px] font-bold uppercase tracking-widest text-[var(--foreground)]/20">CBD</span>
                <span className="text-[9px] font-black tracking-wide" style={{ color: themeColor }}>{cbdDisplay}</span>
              </div>
              <div className="flex min-w-0 items-center justify-end border-l border-white/5 pl-2 text-right">
                <span className="text-[8px] font-medium tracking-wide text-[var(--foreground)]/80 leading-tight">{effectDisplay}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {!strain && (
          <div className="px-3 pb-3">
            <div className="w-full h-[80px] rounded-xl bg-white/5 animate-pulse" />
          </div>
        )}

        {/* User info overlay — bottom right */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
          <span className="text-[10px] text-[var(--foreground)]/40">{formatDate(item.created_at)}</span>
          {isAdminOrGründer && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-7 h-7 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>

        {/* Org logo — top right */}
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#2FF801]/10 border border-[#2FF801]/30 flex items-center justify-center overflow-hidden z-20">
          {orgLogoUrl ? (
            <img src={orgLogoUrl} alt="Community Logo" className="w-full h-full object-cover" />
          ) : (
            <Building2 size={12} className="text-[#2FF801]/60" />
          )}
        </div>
      </div>
    );

    if (strain) {
      return (
        <Link href={`/strains/${strain.slug}`} className="block" onClick={(e) => { if (deleting) e.preventDefault(); }}>
          {cardContent}
        </Link>
      );
    }
    return cardContent;
  }

  // Default card for other event types
  return (
    <Card className="bg-[#1e3a24] border-white/10 p-4 rounded-2xl">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 flex items-center justify-center shrink-0 overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[#00F5FF] text-sm font-bold">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[var(--foreground)] text-sm truncate">{displayName}</span>
            <span className="text-[var(--foreground)]/40 text-xs">{config.label}</span>
          </div>
          <p className="text-[10px] text-[var(--foreground)]/30 mt-0.5">{formatDate(item.created_at)}</p>
        </div>

        {/* Event Icon */}
        <div className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 ${config.color}`}>
          <Icon size={14} />
        </div>

        {/* Delete button for admins */}
        {isAdminOrGründer && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </Card>
  );
});

function EmptyFeed() {
  return (
    <div className="text-center py-12 space-y-3">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
        <Leaf size={24} className="text-[var(--foreground)]/20" />
      </div>
      <p className="text-[var(--foreground)]/40 text-sm">Noch keine Aktivitaeten in dieser Community.</p>
    </div>
  );
}

export function CommunityFeed({ organizationId, refreshKey = 0, isAdminOrGründer = false, orgLogoUrl }: CommunityFeedProps) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await fetch(`/api/communities/${organizationId}/feed`);

        if (res.ok) {
          const data: FeedApiResponse = await res.json();
          setFeed(data.data?.feed || []);
        } else {
          setError("Feed konnte nicht geladen werden.");
        }
      } catch (err) {
        console.error("Error fetching feed:", err);
        setError("Feed konnte nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [organizationId, refreshKey]);

  const handleDelete = (feedId: string) => {
    setFeed((prev) => prev.filter((item) => item.id !== feedId));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-[var(--card)] border border-[var(--border)]/50 p-4 rounded-3xl">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (feed.length === 0) {
    return <EmptyFeed />;
  }

  return (
    <div className="space-y-3">
      {feed.map((item) => (
        <FeedItemCard
          key={item.id}
          item={item}
          isAdminOrGründer={isAdminOrGründer}
          organizationId={organizationId}
          orgLogoUrl={orgLogoUrl}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
