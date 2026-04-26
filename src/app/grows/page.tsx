"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Sprout, Calendar, ArrowRight, Leaf, Compass } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GrowCardImage } from "@/components/grows/grow-card-image";

interface Grow {
  id: string;
  title: string;
  grow_type: string;
  status: string;
  start_date: string;
  cover_image_url?: string | null;
  harvest_date?: string;
  strains?: {
    name: string;
    image_url?: string | null;
  };
  plant_count?: number;
}

export default function GrowsPage() {
  const { user, isDemoMode, loading: authLoading } = useAuth();
  const [grows, setGrows] = useState<Grow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGrows() {
      if (!user && !isDemoMode) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (isDemoMode) {
          setGrows([
            {
              id: "demo-1",
              title: "Purple Haze Outdoor",
              grow_type: "outdoor",
              status: "active",
              start_date: "2024-03-01",
              strains: { name: "Purple Haze" },
              plant_count: 2
            },
            {
              id: "demo-2",
              title: "Gorilla Glue #4 Indoor",
              grow_type: "indoor",
              status: "completed",
              start_date: "2024-01-15",
              harvest_date: "2024-03-20",
              strains: { name: "Gorilla Glue #4" },
              plant_count: 1
            }
          ]);
        } else if (user) {
          // Fetch grows with plant counts
          const { data, error } = await supabase
            .from("grows")
            .select(`*, strains (name, image_url)`)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (data) {
            // Fetch plant counts for each grow
            const growIds = data.map((g: Grow) => g.id);
            const { data: plantCounts } = await supabase
              .from("plants")
              .select("grow_id")
              .in("grow_id", growIds)
              .in("status", ["seedling", "vegetative", "flowering", "flushing"]);

            // Count plants per grow
            const countMap: Record<string, number> = {};
            plantCounts?.forEach((p: { grow_id: string }) => {
              countMap[p.grow_id] = (countMap[p.grow_id] || 0) + 1;
            });

            // Attach plant_count to each grow
            const growsWithCounts = data.map((g: Grow) => ({
              ...g,
              plant_count: countMap[g.id] || 0
            }));
            setGrows(growsWithCounts);
          }
          if (error) console.error("Error fetching grows:", error);
        }
      } catch (err) {
        console.error("Fetch grows error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchGrows();
    }
  }, [user, isDemoMode, authLoading]);

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
            <span className="text-[10px] text-[#2FF801] font-black uppercase tracking-[0.4em]">Grow Tracker</span>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">Meine Grows</h1>
          </div>
          <Link href="/grows/new">
            <Button size="icon" className="bg-gradient-to-br from-[#2FF801] to-[#2fe000] hover:opacity-90 text-black rounded-full shadow-lg shadow-[#2FF801]/30">
              <Plus size={24} />
            </Button>
          </Link>
        </div>
      </header>

      <div className="p-6 relative z-10">
        {/* Explore public grows link */}
        <Link href="/grows/explore" className="flex items-center justify-center gap-2 mb-6 p-3 bg-[var(--card)] border border-[var(--border)]/50 rounded-xl hover:border-[#00F5FF]/50 transition-all">
          <Compass size={16} className="text-[#00F5FF]" />
          <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Öffentliche Grows entdecken</span>
        </Link>

        {loading || authLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-[#00F5FF]" size={48} />
            <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-[0.2em]">Lade Grows...</p>
          </div>
        ) : grows.length > 0 ? (
          <div className="space-y-4">
            {grows.map((grow) => (
              <Card key={grow.id} className="bg-[var(--card)] border border-[var(--border)]/50 overflow-hidden group active:scale-[0.98] transition-all">
                <GrowCardImage
                  primaryUrl={grow.cover_image_url}
                  secondaryUrl={grow.strains?.image_url}
                  alt={grow.title}
                  className="h-36 w-full"
                />
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${grow.status === 'active' ? 'bg-[#2FF801]/10 text-[#2FF801]' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>
                        <Sprout size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-lg uppercase tracking-tight leading-none text-[var(--foreground)] font-display">{grow.title}</h3>
                        <p className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase tracking-widest mt-1">
                          {grow.strains?.name || 'Unbekannte Sorte'} • {grow.grow_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={grow.status === 'active' ? 'bg-[#2FF801] text-black border-none font-bold' : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-none font-bold'}>
                        {grow.status.toUpperCase()}
                      </Badge>
                      {grow.plant_count !== undefined && grow.plant_count > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                          <Leaf size={10} className="text-[#2FF801]" />
                          <span>{grow.plant_count} Pflanze{grow.plant_count !== 1 ? 'n' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]/50">
                    <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                      <Calendar size={12} />
                      <span className="text-[10px] font-bold uppercase">{grow.start_date || 'Kein Startdatum'}</span>
                    </div>
                    <Link href={`/grows/${grow.id}`} className="text-[#00F5FF] text-[10px] font-black uppercase flex items-center gap-1 group-hover:gap-2 transition-all">
                      Details <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 space-y-6">
            <div className="w-20 h-20 bg-[var(--card)] rounded-3xl flex items-center justify-center mx-auto border border-[var(--border)]/50 shadow-2xl">
              <Sprout size={32} className="text-[#2FF801]" />
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight text-[var(--foreground)] font-display">Keine aktiven Grows</h2>
              <p className="text-[var(--muted-foreground)] text-sm mt-2 max-w-[200px] mx-auto">Starte jetzt deinen ersten Grow und tracke deinen Fortschritt!</p>
            </div>
            <Link href="/grows/new">
              <Button className="bg-gradient-to-r from-[#00F5FF] to-[#00e5ee] hover:opacity-90 text-black font-black uppercase tracking-widest text-xs px-8 py-6 rounded-2xl shadow-lg shadow-[#00F5FF]/20">
                Jetzt Starten
              </Button>
            </Link>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
