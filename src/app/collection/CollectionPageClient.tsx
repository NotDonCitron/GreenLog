"use client";

import { useState, useEffect, Suspense, lazy, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useCollection } from "@/hooks/useCollection";
import { BottomNav } from "@/components/bottom-nav";
import { Search, Loader2, AlertCircle, X, Filter, Plus, SlidersHorizontal, Calendar, Sprout, ArrowRight, Leaf } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Strain, StrainSource } from "@/lib/types";
import { StrainCard } from "@/components/strains/strain-card";
import { TopMatches } from "@/components/strains/top-matches";
import { CalendarPanel } from "@/components/collection/calendar-panel"
import { normalizeCollectionSource } from "@/lib/strain-display";
const FilterPanel = lazy(() => import("@/components/strains/filter-panel").then(m => ({ default: m.FilterPanel })));
import { ActiveFilterBadges } from "@/components/strains/active-filter-badges";
import { useSearchParams } from "next/navigation";
import { THC_RANGE, CBD_RANGE } from "@/lib/constants";
import { format, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type CollectionStrain = Strain & {
  collected_at?: string | null;
  created_by?: string | null;
  user_notes?: string | null;
  image_url?: string;
  avg_thc?: number;
  avg_cbd?: number;
};

const SOURCE_FILTERS: { id: StrainSource | "all"; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "pharmacy", label: "Apotheke" },
  { id: "grow", label: "Eigenanbau" },
  { id: "csc", label: "CSC" },
  { id: "other", label: "Sonstiges" },
];

// Separate component for search params sync (must be in Suspense for SSG)
function SearchParamsSync({
  setFilterEffects,
  setFilterThcMin,
  setFilterThcMax,
  setFilterCbdMin,
  setFilterCbdMax,
}: {
  setFilterEffects: (v: string[]) => void;
  setFilterThcMin: (v: number) => void;
  setFilterThcMax: (v: number) => void;
  setFilterCbdMin: (v: number) => void;
  setFilterCbdMax: (v: number) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const effects = searchParams.get("effects")?.split(",").filter(Boolean) || [];
    const thcMin = Number(searchParams.get("thc_min") || THC_RANGE.min);
    const thcMax = Number(searchParams.get("thc_max") || THC_RANGE.max);
    const cbdMin = Number(searchParams.get("cbd_min") || CBD_RANGE.min);
    const cbdMax = Number(searchParams.get("cbd_max") || CBD_RANGE.max);
    setFilterEffects(effects);
    setFilterThcMin(thcMin);
    setFilterThcMax(thcMax);
    setFilterCbdMin(cbdMin);
    setFilterCbdMax(cbdMax);
  }, [searchParams, setFilterEffects, setFilterThcMin, setFilterThcMax, setFilterCbdMin, setFilterCbdMax]);

  return null;
}

type GrowRow = {
  id: string;
  title: string;
  grow_type: string;
  status: string;
  start_date: string;
  harvest_date?: string;
  strains?: { name: string } | null;
  plant_count?: number;
};

export default function CollectionPageClient() {
  const { user, isDemoMode, loading: authLoading } = useAuth();

  // Collection data via useCollection hook
  const { collection, isLoading: loading, error } = useCollection();

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<StrainSource | "all">("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterEffects, setFilterEffects] = useState<string[]>([]);
  const [filterThcMin, setFilterThcMin] = useState(THC_RANGE.min);
  const [filterThcMax, setFilterThcMax] = useState(THC_RANGE.max);
  const [filterCbdMin, setFilterCbdMin] = useState(CBD_RANGE.min);
  const [filterCbdMax, setFilterCbdMax] = useState(CBD_RANGE.max);

  // Collection tab toggle
  const [collectionTab, setCollectionTab] = useState<"strains" | "grows">("strains");

  // Grows data
  const [grows, setGrows] = useState<GrowRow[]>([]);
  const [growsLoading, setGrowsLoading] = useState(false);

  // Scroll ref for calendar date "scroll to first entry" feature
  const strainListRef = useRef<HTMLDivElement>(null);
  const lastSelectedDateRef = useRef<string | null>(null);

  // Handle date selection with scroll-to-first behavior
  const handleDateSelect = useCallback((date: Date | null) => {
    if (!date) {
      setSelectedDate(undefined);
      lastSelectedDateRef.current = null;
      return;
    }

    const dateStr = format(date, "yyyy-MM-dd");
    const isAlreadySelected = selectedDate && format(selectedDate, "yyyy-MM-dd") === dateStr;

    if (isAlreadySelected) {
      const firstCard = strainListRef.current?.querySelector('[data-date="' + dateStr + '"]');

      if (lastSelectedDateRef.current !== dateStr && firstCard) {
        firstCard.scrollIntoView({ behavior: "smooth", block: "center" });
        lastSelectedDateRef.current = dateStr;
      } else {
        setSelectedDate(undefined);
        lastSelectedDateRef.current = null;
      }
    } else {
      setSelectedDate(date);
      lastSelectedDateRef.current = null;
    }
  }, [selectedDate]);

  // Fetch grows when switching to grows tab
  useEffect(() => {
    if (collectionTab !== "grows") return;

    async function fetchGrows() {
      setGrowsLoading(true);
      try {
        if (isDemoMode) {
          setGrows([
            { id: "demo-1", title: "Purple Haze Outdoor", grow_type: "outdoor", status: "active", start_date: "2024-03-01", strains: { name: "Purple Haze" }, plant_count: 2 },
            { id: "demo-2", title: "Gorilla Glue #4 Indoor", grow_type: "indoor", status: "completed", start_date: "2024-01-15", harvest_date: "2024-03-20", strains: { name: "Gorilla Glue #4" }, plant_count: 1 },
          ]);
        } else if (user) {
          const { data } = await supabase
            .from("grows")
            .select("*, strains(name)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (data) {
            const growIds = data.map((g: { id: string }) => g.id);
            const { data: plantCounts } = await supabase
              .from("plants")
              .select("grow_id")
              .in("grow_id", growIds)
              .in("status", ["seedling", "vegetative", "flowering", "flushing"]);

            const countMap: Record<string, number> = {};
            plantCounts?.forEach((p: { grow_id: string }) => {
              countMap[p.grow_id] = (countMap[p.grow_id] || 0) + 1;
            });

            setGrows(data.map((g: { id: string; [key: string]: unknown }) => ({
              ...g,
              plant_count: countMap[g.id] || 0,
            })));
          }
        }
      } catch (err) {
        console.error("Error fetching grows:", err);
      } finally {
        setGrowsLoading(false);
      }
    }

    if (!authLoading) {
      void fetchGrows();
    }
  }, [collectionTab, user, isDemoMode, authLoading]);

  const filteredStrains = useMemo(() => collection.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());

    let matchesSource = true;
    if (sourceFilter === "grow") {
      const isGrow = s.source === "grow" || (!!user && s.created_by === user.id);
      matchesSource = isGrow;
    } else if (sourceFilter !== "all") {
      matchesSource = s.source === sourceFilter;
    }

    let matchesDate = true;
    if (selectedDate && s.collected_at) {
      matchesDate = isSameDay(new Date(s.collected_at), selectedDate);
    }

    const matchesEffects =
      filterEffects.length === 0 ||
      filterEffects.every((ef) =>
        (s.effects || []).some(
          (se) => se.toLowerCase() === ef.toLowerCase()
        )
      );

    const strainThc = s.avg_thc || (s as CollectionStrain).thc_max || 0;
    const matchesThc = strainThc >= filterThcMin && strainThc <= filterThcMax;

    const strainCbd = s.avg_cbd || (s as CollectionStrain).cbd_max || 0;
    const matchesCbd = strainCbd >= filterCbdMin && strainCbd <= filterCbdMax;

    return matchesSearch && matchesSource && matchesDate && matchesEffects && matchesThc && matchesCbd;
  }), [collection, search, sourceFilter, selectedDate, filterEffects, filterThcMin, filterThcMax, filterCbdMin, filterCbdMax, user]);

  const activeGrowsCount = grows.filter(g => g.status === "active").length;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[100px] rounded-full" />
      </div>

      {/* Sync search params to filter state */}
      <Suspense fallback={null}>
        <SearchParamsSync
          setFilterEffects={setFilterEffects}
          setFilterThcMin={setFilterThcMin}
          setFilterThcMax={setFilterThcMax}
          setFilterCbdMin={setFilterCbdMin}
          setFilterCbdMax={setFilterCbdMax}
        />
      </Suspense>

      <header className="sticky top-0 z-50 glass-surface border-b border-[var(--border)]/30 px-6 pt-12 pb-4">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">
              Sammlung
            </h1>
            <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-[0.2em] mt-1 font-medium">
              {collectionTab === "strains" ? "Deine Strains" : "Meine Grows"}
            </p>
          </div>
          {collectionTab === "strains" && (
            <div className="text-right">
              <p className="text-[10px] text-[var(--muted-foreground)] uppercase font-semibold tracking-wider">Anzahl</p>
              <p className="text-2xl font-black text-[#2FF801] neon-text-green font-display">{collection.length}</p>
            </div>
          )}
        </div>

        {/* Segmented Control: Meine Sorten | Meine Grows */}
        <div className="flex gap-2 p-1 bg-[var(--muted)] rounded-2xl">
          <button
            onClick={() => setCollectionTab("strains")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              collectionTab === "strains"
                ? "bg-[#2FF801] text-black shadow-lg shadow-[#2FF801]/20"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <Leaf size={14} />
            Meine Sorten
          </button>
          <button
            onClick={() => setCollectionTab("grows")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              collectionTab === "grows"
                ? "bg-[#2FF801] text-black shadow-lg shadow-[#2FF801]/20"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <Sprout size={14} />
            Meine Grows
            {activeGrowsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#2FF801] text-black text-[10px] font-bold">
                {activeGrowsCount}
              </span>
            )}
          </button>
        </div>

        {collectionTab === "strains" && (
          <>
            {/* Search bar */}
            <div className="relative mb-4 mt-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={18} />
              <input
                type="text"
                placeholder="In Sammlung suchen..."
                className="w-full bg-[var(--input)] border border-[var(--border)]/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-[var(--foreground)] placeholder:text-[#484849] focus:outline-none focus:border-[#00F5FF]/50 focus:ring-1 focus:ring-[#00F5FF]/30 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
              <button
                onClick={() => setIsCalendarOpen(v => !v)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 ${
                  isCalendarOpen
                    ? "bg-[#00F5FF] text-black shadow-[0_0_20px_#00F5FF66]"
                    : "bg-[#00F5FF]/10 text-[#00F5FF] border border-[#00F5FF]/30 hover:bg-[#00F5FF]/20"
                }`}
              >
                <Calendar size={12} />
                Kalender
              </button>
              {SOURCE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSourceFilter(f.id)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all duration-300 ${
                    sourceFilter === f.id
                      ? "bg-[#2FF801] text-black"
                      : "bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <button
                onClick={() => setFilterPanelOpen(true)}
                className="px-4 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all duration-300 bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50"
              >
                <SlidersHorizontal size={12} className="inline mr-1" />
                Filter
              </button>
            </div>

            {/* Calendar Panel (Inline in Header) */}
            <CalendarPanel
              collection={collection as CollectionStrain[]}
              selectedDate={selectedDate || null}
              onDateSelect={handleDateSelect}
              isOpen={isCalendarOpen}
              onToggle={() => setIsCalendarOpen(v => !v)}
            />

            {/* Date filter indicator */}
            {selectedDate && (
              <div className="flex items-center justify-between bg-[#00F5FF]/10 border border-[#00F5FF]/30 rounded-xl px-4 py-2 mt-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <Filter size={12} className="text-[#00F5FF]" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#00F5FF]">
                    Gefiltert: {format(selectedDate, "dd. MMMM yyyy", { locale: de })}
                  </p>
                </div>
                <button onClick={() => setSelectedDate(undefined)} className="text-[#00F5FF] hover:text-[var(--foreground)] transition-colors">
                  <X size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </header>

      {collectionTab === "strains" ? (
        <div className="px-6 py-6">
          <Suspense fallback={null}>
            <TopMatches />
          </Suspense>

          <div className="mt-8 mb-4">
            <h2 className="text-lg font-black italic tracking-tighter uppercase leading-none font-display text-[var(--muted-foreground)] text-center">
              Deine Sammlung
            </h2>
          </div>

          <Suspense fallback={null}>
            <ActiveFilterBadges
              effects={filterEffects}
              thcMin={filterThcMin}
              thcMax={filterThcMax}
              cbdMin={filterCbdMin}
              cbdMax={filterCbdMax}
            />
          </Suspense>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
                <div className="absolute inset-0 blur-xl bg-[#00F5FF]/20 animate-pulse" />
              </div>
              <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-[0.2em]">Lade Archiv...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-[#ff716c]">
              <AlertCircle size={40} />
              <p className="text-sm font-bold uppercase tracking-widest">{(error as Error).message || "Fehler beim Laden"}</p>
            </div>
          ) : filteredStrains.length > 0 ? (
            <div className="grid grid-cols-2 gap-4" ref={strainListRef}>
              {filteredStrains.map((strain, i) => (
                <StrainCard
                  key={strain.id}
                  strain={strain}
                  index={i}
                  isCollected={true}
                  data-date={strain.collected_at ? format(new Date(strain.collected_at), "yyyy-MM-dd") : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--card)] border border-[var(--border)]/50 flex items-center justify-center">
                <span className="text-4xl">🌿</span>
              </div>
              <p className="text-[var(--muted-foreground)] font-bold uppercase tracking-widest text-sm">Keine Treffer</p>
              <p className="text-[#484849] text-xs mt-2">Füge neue Strains hinzu</p>
            </div>
          )}
        </div>
      ) : (
        <div className="px-6 py-6">
          {growsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
              <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-[0.2em]">Lade Grows...</p>
            </div>
          ) : grows.length > 0 ? (
            <div className="space-y-4">
              {grows.map((grow) => (
                <Link key={grow.id} href={`/grows/${grow.id}`}>
                  <Card className="bg-[var(--card)] border border-[var(--border)]/50 overflow-hidden group active:scale-[0.98] transition-all">
                    <div className="p-5 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${grow.status === "active" ? "bg-[#2FF801]/10 text-[#2FF801]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                            <Sprout size={24} />
                          </div>
                          <div>
                            <h3 className="font-black text-lg uppercase tracking-tight leading-none text-[var(--foreground)] font-display">{grow.title}</h3>
                            <p className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase tracking-widest mt-1">
                              {grow.strains?.name || "Unbekannte Sorte"} • {grow.grow_type}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={grow.status === "active" ? "bg-[#2FF801] text-black border-none font-bold" : "bg-[var(--muted)] text-[var(--muted-foreground)] border-none font-bold"}>
                            {grow.status.toUpperCase()}
                          </Badge>
                          {grow.plant_count !== undefined && grow.plant_count > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                              <Leaf size={10} className="text-[#2FF801]" />
                              <span>{grow.plant_count} Pflanze{grow.plant_count !== 1 ? "n" : ""}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]/50">
                        <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                          <Calendar size={12} />
                          <span className="text-[10px] font-bold uppercase">{grow.start_date || "Kein Startdatum"}</span>
                        </div>
                        <span className="text-[#00F5FF] text-[10px] font-black uppercase flex items-center gap-1 group-hover:gap-2 transition-all">
                          Details <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
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
                <button className="bg-gradient-to-r from-[#00F5FF] to-[#00e5ee] hover:opacity-90 text-black font-black uppercase tracking-widest text-xs px-8 py-6 rounded-2xl shadow-lg shadow-[#00F5FF]/20">
                  Jetzt Starten
                </button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* FAB: Navigate to strains page OR new grow */}
      {collectionTab === "strains" ? (
        <Link href="/strains" className="fixed bottom-28 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[#00F5FF] to-[#00e5ee] flex items-center justify-center shadow-lg shadow-[#00F5FF]/30 hover:scale-110 transition-transform z-40" aria-label="Neue Sorte hinzufügen">
          <Plus size={24} className="text-black font-bold" />
        </Link>
      ) : (
        <Link href="/grows/new" className="fixed bottom-28 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[#2FF801] to-[#2fe000] flex items-center justify-center shadow-lg shadow-[#2FF801]/30 hover:scale-110 transition-transform z-40" aria-label="Neues Grow erstellen">
          <Plus size={24} className="text-black font-bold" />
        </Link>
      )}

      <Suspense fallback={null}>
        <FilterPanel open={filterPanelOpen} onOpenChange={setFilterPanelOpen} />
      </Suspense>

      <BottomNav />
    </main>
  );
}
