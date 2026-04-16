"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { USER_ROLES } from "@/lib/roles";
import { ChevronLeft, Loader2, Download, Leaf, Star, Heart } from "lucide-react";

interface StrainAnalytics {
  strain_id: string;
  strain_name: string;
  strain_slug: string;
  strain_image: string | null;
  strain_type: string | null;
  avg_rating: number;
  rating_count: number;
  favorite_count: number;
  wishlist_count: number;
  collected_count: number;
}

interface HeatmapData {
  heatmap: number[][];
  total_activities: number;
  active_members: number;
  days_of_week: string[];
  hours: number[];
}

export default function OrgAnalyticsPage() {
  const { activeOrganization, session } = useAuth();
  const router = useRouter();
  const [strains, setStrains] = useState<StrainAnalytics[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [totalRatings, setTotalRatings] = useState(0);
  const [totalFavorites, setTotalFavorites] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!activeOrganization || !session?.access_token) return;

    const orgId = activeOrganization.organization_id;
    const token = session!.access_token;

    async function fetchData() {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [strainsRes, heatmapRes] = await Promise.all([
          fetch(`/api/organizations/${orgId}/analytics/strains`, { headers }),
          fetch(`/api/organizations/${orgId}/analytics/activity`, { headers }),
        ]);

        if (strainsRes.ok) {
          const data = await strainsRes.json();
          setStrains(data.strains || []);
          setTotalRatings(data.total_ratings || 0);
          setTotalFavorites(data.total_favorites || 0);
        }

        if (heatmapRes.ok) {
          const data = await heatmapRes.json();
          setHeatmap(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [activeOrganization, session]);

  const handleExport = async () => {
    if (!activeOrganization || !session?.access_token) return;
    setExporting(true);
    try {
      const res = await fetch(
        `/api/organizations/${activeOrganization.organization_id}/analytics/export`,
        { headers: { Authorization: `Bearer ${session!.access_token}` } }
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "analytics.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  if (!activeOrganization) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
      </main>
    );
  }

  const canView = [USER_ROLES.GRUENDER, USER_ROLES.ADMIN].some(role => activeOrganization.role === role);
  if (!canView) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-[var(--muted-foreground)]">Kein Zugriff</p>
      </main>
    );
  }

  // Find max heatmap value for color scaling
  let heatmapMax = 1;
  if (heatmap?.heatmap) {
    heatmapMax = Math.max(...heatmap.heatmap.flat(), 1);
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
          <h1 className="text-2xl font-black italic uppercase font-display">Analytics</h1>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
        </div>
      ) : (
        <div className="px-6 space-y-6 relative z-10">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--card)] border border-[var(--border)]/50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star size={16} className="text-[#ffd76a]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Bewertungen</span>
              </div>
              <p className="text-3xl font-black font-display text-[#2FF801]">{totalRatings}</p>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)]/50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Heart size={16} className="text-[#ff6b6b]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Favoriten</span>
              </div>
              <p className="text-3xl font-black font-display text-[#2FF801]">{totalFavorites}</p>
            </div>
          </div>

          {/* Top Strains */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">Top Strains</h2>
            <div className="space-y-2">
              {strains.length === 0 ? (
                <p className="text-center py-8 text-[var(--muted-foreground)]">Noch keine Daten</p>
              ) : (
                strains.slice(0, 10).map((strain, i) => (
                  <div key={strain.strain_id} className="bg-[var(--card)] border border-[var(--border)]/50 rounded-xl p-3 flex items-center gap-3">
                    <span className="text-lg font-black font-display text-[var(--muted-foreground)] w-6">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{strain.strain_name}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        {strain.rating_count} Bew. · ★ {strain.avg_rating} · ♥ {strain.favorite_count}
                      </p>
                    </div>
                    {strain.strain_type && (
                      <span className={`text-[8px] font-bold uppercase px-2 py-1 rounded ${
                        strain.strain_type === "sativa" ? "bg-[#ffd76a]/20 text-[#ffd76a]" :
                        strain.strain_type === "indica" ? "bg-[#00F5FF]/20 text-[#00F5FF]" :
                        "bg-[#a78bfa]/20 text-[#a78bfa]"
                      }`}>
                        {strain.strain_type === "sativa" ? "Sativa" : strain.strain_type === "indica" ? "Indica" : "Hybride"}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Heatmap */}
          {heatmap && heatmap.heatmap && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">Aktivitäts-Heatmap</h2>
              <div className="bg-[var(--card)] border border-[var(--border)]/50 rounded-2xl p-4">
                <div className="flex justify-between mb-1">
                  <span className="text-[8px] text-[var(--muted-foreground)]">Weniger</span>
                  <span className="text-[8px] text-[var(--muted-foreground)]">{heatmap.active_members} aktive Members · {heatmap.total_activities} Events</span>
                  <span className="text-[8px] text-[var(--muted-foreground)]">Mehr</span>
                </div>

                {/* Heatmap grid */}
                <div className="space-y-0.5">
                  {heatmap.heatmap.map((row, dayIdx) => (
                    <div key={dayIdx} className="flex gap-0.5 items-center">
                      <span className="text-[6px] text-[var(--muted-foreground)] w-5 text-right pr-1">{heatmap.days_of_week[dayIdx]}</span>
                      {row.map((count, hourIdx) => {
                        const intensity = Math.min(count / heatmapMax, 1);
                        return (
                          <div
                            key={hourIdx}
                            className="flex-1 h-3 rounded-[2px]"
                            style={{
                              backgroundColor: intensity === 0
                                ? "var(--card)"
                                : `rgba(47, 248, 1, ${intensity * 0.8 + 0.1})`,
                            }}
                            title={`${heatmap.days_of_week[dayIdx]} ${hourIdx}:00 - ${count} Events`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Hour labels */}
                <div className="flex gap-0.5 mt-1 pl-5">
                  {[0, 6, 12, 18, 23].map(h => (
                    <span key={h} className="text-[6px] text-[var(--muted-foreground)]" style={{ flex: 1 }}>{h}:00</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={() => void handleExport()}
            disabled={exporting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#2FF801] to-[#00F5FF] text-black font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
            {exporting ? "Exportiere..." : "Als CSV exportieren"}
          </button>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
