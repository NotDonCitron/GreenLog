"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Sprout, Calendar, Leaf } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KCanGDisclaimer } from "@/components/grows/kcan-g-disclaimer";

interface Grow {
  id: string;
  title: string;
  grow_type: string;
  status: string;
  start_date: string;
  is_public: boolean;
  strains?: {
    name: string;
  } | null;
  plant_count?: number;
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

const GROW_TYPES = ['all', 'indoor', 'outdoor', 'greenhouse'] as const;
const PAGE_SIZE = 20;

export default function ExploreGrowsPage() {
  const { user, isDemoMode } = useAuth();
  const [grows, setGrows] = useState<Grow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [growTypeFilter, setGrowTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    async function fetchGrows() {
      setLoading(true);

      try {
        if (isDemoMode) {
          // Demo mode: show sample data
          setGrows([
            {
              id: "demo-1",
              title: "Purple Haze Outdoor",
              grow_type: "outdoor",
              status: "active",
              start_date: "2024-03-01",
              is_public: true,
              strains: { name: "Purple Haze" },
              plant_count: 2,
              profiles: { username: "demo_user", display_name: "Demo User", avatar_url: null }
            }
          ]);
          setTotalCount(1);
          setHasMore(false);
        } else {
          // Build query for public grows with strain and profile info
          let query = supabase
            .from("grows")
            .select(`
              id,
              title,
              grow_type,
              status,
              start_date,
              is_public,
              strains:strain_id(name),
              profiles:user_id(username, display_name, avatar_url)
            `, { count: 'exact' })
            .eq("is_public", true)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

          // Apply grow type filter
          if (growTypeFilter !== 'all') {
            query = query.eq("grow_type", growTypeFilter);
          }

          // Apply search filter (client-side for simplicity)
          const { data, error, count } = await query;

          if (error) throw error;

          // Fetch plant counts for these grows
          if (data && data.length > 0) {
            const growsTyped = data as unknown as Grow[];
            const growIds = growsTyped.map((g) => g.id);
            const { data: plantCounts } = await supabase
              .from("plants")
              .select("grow_id")
              .in("grow_id", growIds)
              .in("status", ["seedling", "vegetative", "flowering", "flushing"]);

            const countMap: Record<string, number> = {};
            plantCounts?.forEach((p: { grow_id: string }) => {
              countMap[p.grow_id] = (countMap[p.grow_id] || 0) + 1;
            });

            const growsWithCounts = growsTyped.map((g) => ({
              ...g,
              plant_count: countMap[g.id] || 0
            }));

            // Apply search filter client-side
            const filtered = searchQuery.trim()
              ? growsWithCounts.filter((g: Grow) =>
                  g.title.toLowerCase().includes(searchQuery.toLowerCase())
                )
              : growsWithCounts;

            setGrows(filtered);
            setTotalCount(count || 0);
            setHasMore(data.length === PAGE_SIZE);
          } else {
            setGrows([]);
            setTotalCount(0);
            setHasMore(false);
          }
        }
      } catch (err) {
        console.error("Error fetching public grows:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchGrows();
  }, [page, growTypeFilter, isDemoMode, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
    setGrows([]);
  }, [searchQuery, growTypeFilter]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
      </div>

      <header className="sticky top-0 z-50 glass-surface border-b border-[var(--border)]/50 px-6 pt-12 pb-4">
        <div className="flex justify-between items-end mb-6">
          <div>
            <span className="text-[10px] text-[#2FF801] font-black uppercase tracking-[0.4em]">Grow Explorer</span>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">Entdecken</h1>
          </div>
          <Badge className="bg-[#00F5FF]/10 text-[#00F5FF] border-none font-bold">
            {totalCount} öffentliche Grows
          </Badge>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#484849] pointer-events-none" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nach Grow suchen..."
            className="w-full h-12 pl-11 pr-4 bg-[var(--input)] border border-[var(--border)]/50 rounded-xl text-[var(--foreground)] placeholder:text-[#484849] text-sm font-medium focus:outline-none focus:border-[#00F5FF]/50 transition-colors"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {GROW_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setGrowTypeFilter(type)}
              className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                growTypeFilter === type
                  ? 'bg-[#2FF801] text-black'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--card)]'
              }`}
            >
              {type === 'all' ? 'Alle' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <div className="p-6 relative z-10 space-y-4">
        {/* KCanG Disclaimer */}
        <KCanGDisclaimer />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-[#00F5FF]" size={48} />
            <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-[0.2em]">Lade öffentliche Grows...</p>
          </div>
        ) : grows.length > 0 ? (
          <>
            <div className="space-y-4">
              {grows.map((grow) => (
                <Link key={grow.id} href={`/grows/explore/${grow.id}`}>
                  <Card className="bg-[var(--card)] border border-[var(--border)]/50 overflow-hidden group hover:border-[#00F5FF]/50 transition-all">
                    <div className="p-5 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#2FF801]/10 text-[#2FF801]">
                            <Sprout size={24} />
                          </div>
                          <div>
                            <h3 className="font-black text-lg uppercase tracking-tight leading-none text-[var(--foreground)] font-display">{grow.title}</h3>
                            <p className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase tracking-widest mt-1">
                              {grow.strains?.name || 'Unbekannte Sorte'} • {grow.grow_type}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-[#2FF801] text-black border-none font-bold">
                          {grow.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]/50">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                            <Calendar size={12} />
                            <span className="text-[10px] font-bold uppercase">{grow.start_date || 'Kein Datum'}</span>
                          </div>
                          {grow.plant_count !== undefined && grow.plant_count > 0 && (
                            <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                              <Leaf size={12} className="text-[#2FF801]" />
                              <span className="text-[10px] font-bold">{grow.plant_count} Pflanze{grow.plant_count !== 1 ? 'n' : ''}</span>
                            </div>
                          )}
                        </div>
                        {grow.profiles && (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[var(--muted)] flex items-center justify-center overflow-hidden">
                              {grow.profiles.avatar_url ? (
                                <img src={grow.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[8px] font-bold text-[#00F5FF]">
                                  {grow.profiles.username?.[0]?.toUpperCase() || '?'}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[var(--muted-foreground)]">
                              @{grow.profiles.username}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => setPage(page + 1)}
                  variant="outline"
                  className="border-[var(--border)]/50 text-[var(--muted-foreground)]"
                >
                  Mehr laden
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 space-y-6">
            <div className="w-20 h-20 bg-[var(--card)] rounded-3xl flex items-center justify-center mx-auto border border-[var(--border)]/50 shadow-2xl">
              <Sprout size={32} className="text-[#484849]" />
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight text-[var(--foreground)] font-display">Keine öffentlichen Grows</h2>
              <p className="text-[var(--muted-foreground)] text-sm mt-2 max-w-[250px] mx-auto">
                {searchQuery ? 'Keine Grows entsprechen deiner Suche.' : 'Werde der Erste, der ein öffentliches Grow teilt!'}
              </p>
            </div>
            {user && (
              <Link href="/grows/new">
                <Button className="bg-gradient-to-r from-[#00F5FF] to-[#00e5ee] hover:opacity-90 text-black font-black uppercase tracking-widest text-xs px-8 py-6 rounded-2xl shadow-lg shadow-[#00F5FF]/20">
                  Eigenes Grow erstellen
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
