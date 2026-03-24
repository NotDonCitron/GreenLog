"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Search, Loader2, AlertCircle, Plus, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Strain, StrainSource } from "@/lib/types";
import { CreateStrainModal } from "@/components/strains/create-strain-modal";
import { StrainCard } from "@/components/strains/strain-card";

const SOURCE_OVERRIDE_STORAGE_KEY = "greenlog:strain-source-overrides";

export default function StrainsPage() {
  const { user, isDemoMode } = useAuth();
  const router = useRouter();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [userCollection, setUserCollection] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<StrainSource | "all" | "mine">("all");
  const [error, setError] = useState<string | null>(null);
  const [sourceOverrides, setSourceOverrides] = useState<Record<string, StrainSource>>({});
  const [sourceOverridesReady, setSourceOverridesReady] = useState(false);

  const persistSourceOverride = (strainId: string, strainSource: StrainSource) => {
    setSourceOverrides((current) => {
      const next = {
        ...current,
        [strainId]: strainSource,
      };

      try {
        window.localStorage.setItem(SOURCE_OVERRIDE_STORAGE_KEY, JSON.stringify(next));
      } catch (storageError) {
        console.warn("[StrainsPage] Failed to persist source override", {
          strainId,
          strainSource,
          storageError,
        });
      }

      return next;
    });
  };

  const handleStrainCreated = (
    strainId: string,
    slug: string,
    strainSource: StrainSource,
    usedSourceFallback = false,
  ) => {
    if (usedSourceFallback) {
      persistSourceOverride(strainId, strainSource);
    }

    setSourceFilter("mine");
    setSearch("");
    void router.push(`/strains/${slug}`);
  };

  const matchesSourceFilter = (strain: Strain) => {
    if (sourceFilter === "mine") {
      return !!user && strain.created_by === user.id;
    }

    if (sourceFilter === "all") {
      return true;
    }

    return strain.source === sourceFilter;
  };

  useEffect(() => {
    try {
      const storedOverrides = window.localStorage.getItem(SOURCE_OVERRIDE_STORAGE_KEY);
      if (storedOverrides) {
        const parsedOverrides = JSON.parse(storedOverrides) as Record<string, StrainSource>;
        setSourceOverrides(parsedOverrides);
      }
    } catch (storageError) {
      console.warn("[StrainsPage] Failed to load source overrides", storageError);
    } finally {
      setSourceOverridesReady(true);
    }
  }, []);

  useEffect(() => {
    if (!sourceOverridesReady) {
      return;
    }

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch all strains
        const { data: allStrains, error: strainError } = await supabase
          .from("strains")
          .select("*")
          .order("name");

        if (strainError) throw new Error(strainError.message);

        // 2. Fetch user's collection settings (Source Overrides)
        let mergedOverrides = { ...sourceOverrides };
        if (user) {
          const { data: collectionSettings, error: collectionError } = await supabase
            .from("user_collection")
            .select("strain_id, batch_info")
            .eq("user_id", user.id);

          if (!collectionError && collectionSettings) {
            collectionSettings.forEach(item => {
              if (["apotheke", "street", "grow", "pharmacy"].includes(item.batch_info || "")) {
                mergedOverrides[item.strain_id] = item.batch_info as StrainSource;
              }
            });
            setSourceOverrides(mergedOverrides);
          }
        }

        if (allStrains) {
          const normalizedStrains = allStrains.map((strain) => ({
            ...strain,
            source: strain.source ?? mergedOverrides[strain.id] ?? "pharmacy",
          }));
          setStrains(normalizedStrains as Strain[]);
        }

        // 3. Fetch user's collected strains
        if (user) {
          const { data: ratings, error: ratingsError } = await supabase
            .from("ratings")
            .select("strain_id")
            .eq("user_id", user.id);

          if (ratings) setUserCollection(ratings.map(r => r.strain_id));
        }

        if (isDemoMode && allStrains) {
          setUserCollection(allStrains.slice(0, 3).map((s) => s.id));
        }
      } catch (err: unknown) {
        console.error("Fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load database content.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, isDemoMode, sourceOverridesReady]); // sourceOverrides intentional removed to avoid infinite loops since it's merged inside

  const filteredStrains = strains.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = matchesSourceFilter(s);
    return matchesSearch && matchesFilter;
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
          <Button
            size="sm"
            variant={sourceFilter === "csc" ? "default" : "outline"}
            onClick={() => setSourceFilter("csc")}
            className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === "csc" ? "bg-[#2FF801] text-black" : "bg-white/5 border-white/10 text-white/60"}`}
          >
            🏢 CSC
          </Button>
          <Button
            size="sm"
            variant={sourceFilter === "other" ? "default" : "outline"}
            onClick={() => setSourceFilter("other")}
            className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === "other" ? "bg-[#2FF801] text-black" : "bg-white/5 border-white/10 text-white/60"}`}
          >
            📦 Sonstiges
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
        </div>
      </header>

      <div className="p-6 relative">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-red-500">
            <AlertCircle size={48} />
            <p className="text-sm font-bold uppercase tracking-widest text-center">{error}</p>
          </div>
        ) : loading && strains.length === 0 ? (
          <div className="grid grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4.5] rounded-3xl bg-white/5 border border-white/10 animate-pulse flex flex-col p-4 gap-4">
                <div className="w-2/3 h-6 bg-white/10 rounded-lg" />
                <div className="w-full flex-1 bg-white/5 rounded-xl" />
                <div className="w-full h-12 bg-white/10 rounded-xl mt-auto" />
              </div>
            ))}
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

      <div className="fixed bottom-24 right-6 z-50">
        <CreateStrainModal
          onSuccess={handleStrainCreated}
          trigger={
            <button className="w-14 h-14 bg-[#2FF801] hover:bg-[#2FF801]/90 text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(47,248,1,0.4)] transition-transform active:scale-95">
              <Plus size={28} />
            </button>
          }
        />
      </div>

      <BottomNav />
    </main>
  );
}
