"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Search, Loader2, AlertCircle, Plus, Camera } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Strain, StrainSource } from "@/lib/types";
import { CreateStrainModal } from "@/components/strains/create-strain-modal";
import { StrainCard } from "@/components/strains/strain-card";

const SOURCE_OVERRIDE_STORAGE_KEY = "greenlog:strain-source-overrides";

function TabParamReader({
  activeOrganization,
  onTabReady,
}: {
  activeOrganization: ReturnType<typeof useAuth>["activeOrganization"];
  onTabReady: (tab: "catalog" | "org") => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "org" && activeOrganization) {
      onTabReady("org");
    } else if (tab === "org") {
      void router.replace("/strains");
    }
  }, [searchParams, activeOrganization, router, onTabReady]);

  return null;
}

export default function StrainsPage() {
  const { user, isDemoMode, activeOrganization } = useAuth();
  const router = useRouter();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [userCollection, setUserCollection] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<StrainSource | "all" | "mine">("all");
  const [activeTab, setActiveTab] = useState<"catalog" | "org">("catalog");
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
    if (sourceFilter === "all") {
      return true;
    }

    if (sourceFilter === "grow") {
      // Zeige Sorten mit Source 'grow' ODER alles was vom aktuellen User erstellt wurde
      const isCreator = user?.id && strain.created_by === user.id;
      return strain.source === "grow" || isCreator;
    }

    if (sourceFilter === "other") {
      return strain.source === "other" || strain.source === "street";
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
        // 1. Fetch strains based on active tab
        let strainsQuery = supabase
          .from("strains")
          .select("*")
          .order("name");

        if (activeTab === "catalog") {
          strainsQuery = strainsQuery.is("organization_id", null);
        } else if (activeOrganization) {
          strainsQuery = strainsQuery.eq("organization_id", activeOrganization.organization_id);
        }

        const { data: allStrains, error: strainError } = await strainsQuery;

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

        // 3. Fetch user's collected strains (from both collection and ratings)
        if (user) {
          const [collectionRes, ratingsRes] = await Promise.all([
            supabase.from("user_collection").select("strain_id").eq("user_id", user.id),
            supabase.from("ratings").select("strain_id").eq("user_id", user.id)
          ]);

          const collectedIds = new Set([
            ...(collectionRes.data?.map(c => c.strain_id) || []),
            ...(ratingsRes.data?.map(r => r.strain_id) || [])
          ]);

          setUserCollection(Array.from(collectedIds));
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
  }, [user, isDemoMode, sourceOverridesReady, activeTab]);

  const filteredStrains = strains.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = matchesSourceFilter(s);
    return matchesSearch && matchesFilter;
  });

  return (
    <main className="min-h-screen bg-white text-black pb-32">
      <Suspense fallback={null}>
        <TabParamReader
          activeOrganization={activeOrganization}
          onTabReady={(tab) => setActiveTab(tab)}
        />
      </Suspense>
      <header className="p-8 sticky top-0 bg-white z-50 border-b border-black/10">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Strains</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-black/40 uppercase font-bold">Progress</p>
            <p className="text-xl font-black text-[#2FF801]">{userCollection.length} / {strains.length || 20}</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-black/20" size={18} />
          <input
            type="text"
            placeholder="Sorte suchen..."
            className="w-full bg-black/5 border border-black/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-[#2FF801]/50 transition-all shadow-inner text-black"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
              activeTab === "catalog"
                ? "bg-[#2FF801] text-black"
                : "bg-black/5 border border-black/10 text-black/60"
            }`}
          >
            Katalog
          </button>
          {activeOrganization && (
            <button
              onClick={() => setActiveTab("org")}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                activeTab === "org"
                  ? "bg-[#00F5FF] text-black"
                  : "bg-black/5 border border-black/10 text-black/60"
              }`}
            >
              {activeOrganization.organizations?.name || "Organisation"}
            </button>
          )}
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
          <Button
            size="sm"
            variant={sourceFilter === "all" ? "default" : "outline"}
            onClick={() => setSourceFilter("all")}
            className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === "all" ? "bg-[#2FF801] text-black" : "bg-black/5 border-black/10 text-black/60"}`}
          >
            Alle
          </Button>
          <Button
            size="sm"
            variant={sourceFilter === "pharmacy" ? "default" : "outline"}
            onClick={() => setSourceFilter("pharmacy")}
            className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === "pharmacy" ? "bg-[#2FF801] text-black" : "bg-black/5 border-black/10 text-black/60"}`}
          >
            🧪 Apotheke
          </Button>
          <Button
            size="sm"
            variant={sourceFilter === "grow" ? "default" : "outline"}
            onClick={() => setSourceFilter("grow")}
            className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === "grow" ? "bg-[#2FF801] text-black" : "bg-black/5 border-black/10 text-black/60"}`}
          >
            🌱 Eigenanbau
          </Button>
          <Button
            size="sm"
            variant={sourceFilter === "csc" ? "default" : "outline"}
            onClick={() => setSourceFilter("csc")}
            className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === "csc" ? "bg-[#2FF801] text-black" : "bg-black/5 border-black/10 text-black/60"}`}
          >
            🏢 CSC
          </Button>
          <Button
            size="sm"
            variant={sourceFilter === "other" ? "default" : "outline"}
            onClick={() => setSourceFilter("other")}
            className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === "other" ? "bg-[#2FF801] text-black" : "bg-black/5 border-black/10 text-black/60"}`}
          >
            📦 Sonstiges
          </Button>
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
              <div key={i} className="aspect-[3/4.5] rounded-3xl bg-black/5 border border-black/10 animate-pulse flex flex-col p-4 gap-4">
                <div className="w-2/3 h-6 bg-black/10 rounded-lg" />
                <div className="w-full flex-1 bg-black/5 rounded-xl" />
                <div className="w-full h-12 bg-black/10 rounded-xl mt-auto" />
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

      <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-4">
        <Link href="/scanner">
          <button className="w-14 h-14 bg-[#00F5FF] hover:bg-[#00F5FF]/90 text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-transform active:scale-95">
            <Camera size={28} />
          </button>
        </Link>
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
