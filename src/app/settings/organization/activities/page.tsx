"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { ChevronLeft, Loader2, Leaf, Users, Mail, Shield } from "lucide-react";
import type { OrganizationActivity } from "@/lib/types";

const EVENT_CONFIG: Record<string, { icon: typeof Leaf; color: string; label: string }> = {
  strain_added: { icon: Leaf, color: "#2FF801", label: "hat Strain hinzugefügt" },
  strain_updated: { icon: Leaf, color: "#2FF801", label: "hat Strain bearbeitet" },
  strain_removed: { icon: Leaf, color: "#ff716c", label: "hat Strain entfernt" },
  member_joined: { icon: Users, color: "#00F5FF", label: "ist beigetreten" },
  member_removed: { icon: Users, color: "#ff716c", label: "wurde entfernt" },
  role_changed: { icon: Shield, color: "#ffd76a", label: "Rolle geändert" },
  invite_sent: { icon: Mail, color: "#ffd76a", label: "Einladung verschickt" },
  invite_accepted: { icon: Mail, color: "#2FF801", label: "Einladung angenommen" },
  invite_revoked: { icon: Mail, color: "#ff716c", label: "Einladung widerrufen" },
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "gerade eben";
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  return `vor ${diffDays} T.`;
}

export default function OrgActivitiesPage() {
  const { activeOrganization, session } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<OrganizationActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!activeOrganization || !session?.access_token) return;

    const fetchActivities = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "20", offset: String(offset) });
        if (filter) params.set("event_type", filter);

        const res = await fetch(
          `/api/organizations/${activeOrganization.organization_id}/activities?${params}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );

        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        const { activities: fetchedActivities, has_more: fetchedHasMore } = json.data ?? { activities: [], has_more: false };
        setActivities(offset === 0 ? (fetchedActivities ?? []) : [...activities, ...(fetchedActivities ?? [])]);
        setHasMore(fetchedHasMore);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void fetchActivities();
  }, [activeOrganization, session, filter, offset]);

  if (!activeOrganization) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
      </main>
    );
  }

  const canView = ["gründer", "admin"].includes(activeOrganization.role);
  if (!canView) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-[var(--muted-foreground)]">Kein Zugriff</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
      </div>

      <header className="px-6 pt-12 pb-4 flex items-center gap-4 relative z-10">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-[var(--card)] border border-[var(--border)]/50"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00F5FF]">
            {activeOrganization.organizations?.name}
          </p>
          <h1 className="text-2xl font-black italic uppercase font-display">Aktivitäten</h1>
        </div>
      </header>

      {/* Filter */}
      <div className="px-6 py-3 flex gap-2 overflow-x-auto relative z-10">
        {[
          { key: null, label: "Alle" },
          { key: "strain_added", label: "Strains" },
          { key: "member_joined", label: "Members" },
          { key: "invite_sent", label: "Einladungen" },
        ].map(({ key, label }) => (
          <button
            key={String(key)}
            onClick={() => { setFilter(key); setOffset(0); setActivities([]); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap ${
              filter === key
                ? "bg-[#2FF801] text-black"
                : "bg-[var(--card)] border border-[var(--border)]/50 text-[var(--muted-foreground)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="px-6 space-y-3 relative z-10">
        {activities.length === 0 && !loading ? (
          <div className="text-center py-20 text-[var(--muted-foreground)]">
            Noch keine Aktivitäten
          </div>
        ) : (
          activities.map((activity) => {
            const config = EVENT_CONFIG[activity.event_type] ?? EVENT_CONFIG.strain_added;
            const Icon = config.icon;
            const userName = activity.user?.display_name || activity.user?.username || "System";

            return (
              <div
                key={activity.id}
                className="bg-[var(--card)] border border-[var(--border)]/50 rounded-2xl p-4 flex items-start gap-3"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${config.color}20` }}
                >
                  <Icon size={18} style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[var(--foreground)] truncate">{userName}</p>
                    <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">
                      {formatTimeAgo(activity.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {config.label}{" "}
                    {activity.target_name && (
                      <span className="text-[var(--foreground)] font-semibold">
                        "{activity.target_name}"
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-[#00F5FF]" size={24} />
          </div>
        )}

        {hasMore && !loading && (
          <button
            onClick={() => setOffset((o) => o + 20)}
            className="w-full py-4 text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] border border-dashed border-[var(--border)]/50 rounded-xl"
          >
            Mehr laden
          </button>
        )}
      </div>

      <BottomNav />
    </main>
  );
}