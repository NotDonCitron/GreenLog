"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Leaf, Sprout, Star, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";

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

interface FeedResponse {
  feed: FeedItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CommunityFeedProps {
  organizationId: string;
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

function FeedItemCard({ item }: { item: FeedItem }) {
  const config = eventTypeConfig[item.event_type] || {
    icon: Leaf,
    label: "hat etwas aktualisiert",
    color: "text-white/60",
  };
  const Icon = config.icon;

  const [strainSlug, setStrainSlug] = useState<string | null>(null);

  useEffect(() => {
    if (item.event_type === "strain_created" && item.reference_id) {
      supabase
        .from("strains")
        .select("slug")
        .eq("id", item.reference_id)
        .single()
        .then(({ data }) => {
          if (data?.slug) setStrainSlug(data.slug);
        });
    }
  }, [item.event_type, item.reference_id]);

  const displayName = item.user?.display_name || item.user?.username || "Unbekannter User";
  const avatarUrl = item.user?.avatar_url;

  const cardContent = (
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
            <span className="font-bold text-white text-sm truncate">{displayName}</span>
            <span className="text-white/40 text-xs">{config.label}</span>
          </div>
          <p className="text-[10px] text-white/30 mt-0.5">{formatDate(item.created_at)}</p>
        </div>

        {/* Event Icon */}
        <div className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 ${config.color}`}>
          <Icon size={14} />
        </div>
      </div>
    </Card>
  );

  if (item.event_type === "strain_created" && strainSlug) {
    return (
      <Link href={`/strains/${strainSlug}`} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

function EmptyFeed() {
  return (
    <div className="text-center py-12 space-y-3">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
        <Leaf size={24} className="text-white/20" />
      </div>
      <p className="text-white/40 text-sm">Noch keine Aktivitaeten in dieser Community.</p>
    </div>
  );
}

export function CommunityFeed({ organizationId }: CommunityFeedProps) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await fetch(`/api/communities/${organizationId}/feed`);

        if (res.ok) {
          const data: FeedResponse = await res.json();
          setFeed(data.feed || []);
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
  }, [organizationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-white/40" />
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
        <FeedItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
