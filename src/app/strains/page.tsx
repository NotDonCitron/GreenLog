"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Trophy, Lock, AlertCircle, Leaf, Plus, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Strain, StrainSource } from "@/lib/types";
import { CreateStrainModal } from "@/components/strains/create-strain-modal";
import { StrainCard } from "@/components/strains/strain-card";

export default function StrainsPage() {
  const { user, isDemoMode } = useAuth();
  const router = useRouter();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [userCollection, setUserCollection] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<StrainSource | "all" | "mine">("all");
  const [error, setError] = useState<string | null>(null);

  const handleStrainCreated = (strainId: string, slug: string) => {
    // Refresh the strains list
    window.location.reload();
    // Navigate to the new strain
    router.push(`/strains/${slug}`);
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        console.log("Fetching strains...");

        // 1. Alle Strains laden (Direkte Abfrage ohne Umwege)
        const { data: allStrains, error: strainError } = await supabase
          .from("strains")
          .select("*")
          .order("name");

        if (strainError) {
          console.error("Supabase Error:", strainError);
          throw new Error(strainError.message);
        }

        if (allStrains) {
          setStrains(allStrains as Strain[]);
        }

        // 2. User Collection laden (Parallel, damit es den Strain-Load nicht blockt)
        if (user) {
          const { data: ratings } = await supabase
            .from("ratings")
            .select("strain_id")
            .eq("user_id", user.id);
          if (ratings) setUserCollection(ratings.map(r => r.strain_id));
        }

        if (isDemoMode && allStrains) {
          setUserCollection(allStrains.slice(0, 3).map((s: any) => s.id));
        }
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to load database content.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, isDemoMode]);

  const filteredStrains = strains.filter(s => {
    // Search filter
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());

    // Source filter
    if (sourceFilter === "mine") {
      return matchesSearch && s.is_custom && s.created_by === user?.id;
    }
    if (sourceFilter === "all") {
      return matchesSearch;
    }
    return matchesSearch && s.source === sourceFilter;
  });

  return (
    <main className="min-h-screen bg-[#355E3B] text-white pb-32">
      <header className="p-8 sticky top-0 bg-[#355E3B]/90 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-end mb-6">
          <div>
            <span className="text-[10px] text-[#00F5FF] font-black uppercase tracking-[0.4em]">Sticker Album</span>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">World Collection</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/40 uppercase font-bold">Progress</p>
            <p className="text-xl font-black text-[#2FF801]">{userCollection.length} / {strains.length || 20}</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-white/20" size={18} />
          <input
            type="text"
            placeholder="Sorte suchen..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-[#00F5FF]/50 transition-all shadow-inner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Source Filter Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 -mx-1 px-1">
          <Button
            size="sm"
            variant={sourceFilter === "all" ? "default" : "outline"}
            onClick={() => setSourceFilter("all")}
            className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === "all" ? "bg-[#2FF801] text-black" : "bg-white/5 border-white/10 text-white/60"}`}
          >
            Alle
          </Button>
          <Button
            size="sm"
            variant={sourceFilter === "pharmacy" ? "default" : "outline"}
            onClick={() => setSourceFilter("pharmacy")}
            className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === "pharmacy" ? "bg-[#2FF801] text-black" : "bg-white/5 border-white/10 text-white/60"}`}
          >
            🧪 Apotheke
          </Button>
          <Button
            size="sm"
            variant={sourceFilter === "street" ? "default" : "outline"}
            onClick={() => setSourceFilter("street")}
            className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === "street" ? "bg-[#2FF801] text-black" : "bg-white/5 border-white/10 text-white/60"}`}
          >
            📦 Street
          </Button>
          <Button
            size="sm"
            variant={sourceFilter === "grow" ? "default" : "outline"}
            onClick={() => setSourceFilter("grow")}
            className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === "grow" ? "bg-[#2FF801] text-black" : "bg-white/5 border-white/10 text-white/60"}`}
          >
            🌱 Eigenanbau
          </Button>
          {user && (
            <Button
              size="sm"
              variant={sourceFilter === "mine" ? "default" : "outline"}
              onClick={() => setSourceFilter("mine")}
              className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === "mine" ? "bg-[#00F5FF] text-black" : "bg-white/5 border-white/10 text-white/60"}`}
            >
              <User size={12} className="mr-1" />
              Meine
            </Button>
          )}
          <div className="flex-1" />
          <CreateStrainModal
            onSuccess={handleStrainCreated}
            trigger={
              <Button size="sm" className="rounded-xl text-[10px] font-bold bg-[#2FF801] hover:bg-[#2FF801]/90 text-black whitespace-nowrap">
                <Plus size={14} className="mr-1" />
                Eigen
              </Button>
            }
          />
        </div>
      </header>

      <div className="p-6">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-red-500">
            <AlertCircle size={48} />
            <p className="text-sm font-bold uppercase tracking-widest text-center">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase">System Neustart</button>
          </div>
        ) : loading && strains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-[#00F5FF]" size={48} />
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Initialisierung läuft...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {filteredStrains.map((strain, i) => {
              const isCollected = userCollection.includes(strain.id);
              return (
                <StrainCard key={strain.id} strain={strain} index={i} isCollected={isCollected} />
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
