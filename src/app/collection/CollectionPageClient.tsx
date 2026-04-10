"use client";

import { useState, useEffect, Suspense, lazy, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useCollection } from "@/hooks/useCollection";
import { BottomNav } from "@/components/bottom-nav";
import { Search, Loader2, AlertCircle, X, Filter, Plus, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Strain, StrainSource } from "@/lib/types";
import { StrainCard } from "@/components/strains/strain-card";
import { CalendarPanel } from "@/components/collection/calendar-panel"
import { normalizeCollectionSource } from "@/lib/strain-display";
const FilterPanel = lazy(() => import("@/components/strains/filter-panel").then(m => ({ default: m.FilterPanel })));
import { ActiveFilterBadges } from "@/components/strains/active-filter-badges";
import { useRouter, useSearchParams } from "next/navigation";
import { THC_RANGE, CBD_RANGE } from "@/lib/constants";
import { format, isSameDay } from "date-fns";
import { de } from "date-fns/locale";

type CollectionStrain = Strain & {
  collected_at?: string | null;
  created_by?: string | null;
  user_notes?: string | null;
  image_url?: string;
  avg_thc?: number;
  avg_cbd?: number;
};

type CollectionRow = {
  batch_info: string | null;
  user_notes: string | null;
  user_thc_percent: number | null;
  user_cbd_percent: number | null;
  user_image_url: string | null;
  date_added: string | null;
  strain: Strain[] | Strain | null;
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

export default function CollectionPageClient() {
  const { user } = useAuth();

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

  // Scroll ref for calendar date "scroll to first entry" feature
  const strainListRef = useRef<HTMLDivElement>(null);
  const lastSelectedDateRef = useRef<string | null>(null);

  // Handle date selection with scroll-to-first behavior
  const handleDateSelect = useCallback((date: Date | null) => {
    setSelectedDate(date ?? undefined);

    if (date) {
      const dateStr = format(date, "yyyy-MM-dd");

      // Second click on same date = scroll to first entry
      if (lastSelectedDateRef.current === dateStr && strainListRef.current) {
        const firstCard = strainListRef.current.querySelector('[data-date="' + dateStr + '"]');
        if (firstCard) {
          firstCard.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }

      lastSelectedDateRef.current = dateStr;
    } else {
      lastSelectedDateRef.current = null;
    }
  }, []);

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

    // Effect filter: strain must have ALL selected effects
    const matchesEffects =
      filterEffects.length === 0 ||
      filterEffects.every((ef) =>
        (s.effects || []).some(
          (se) => se.toLowerCase() === ef.toLowerCase()
        )
      );

    // THC filter
    const strainThc = s.avg_thc || (s as CollectionStrain).thc_max || 0;
    const matchesThc = strainThc >= filterThcMin && strainThc <= filterThcMax;

    // CBD filter
    const strainCbd = s.avg_cbd || (s as CollectionStrain).cbd_max || 0;
    const matchesCbd = strainCbd >= filterCbdMin && strainCbd <= filterCbdMax;

    return matchesSearch && matchesSource && matchesDate && matchesEffects && matchesThc && matchesCbd;
  }), [collection, search, sourceFilter, selectedDate, filterEffects, filterThcMin, filterThcMax, filterCbdMin, filterCbdMax, user]);

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
        <div className="flex justify-between items-end mb-5">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">
              Sammlung
            </h1>
            <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-[0.2em] mt-1 font-medium">
              Deine Strains
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[var(--muted-foreground)] uppercase font-semibold tracking-wider">Anzahl</p>
            <p className="text-2xl font-black text-[#2FF801] neon-text-green font-display">{collection.length}</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
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
      </header>

      {/* Calendar Panel */}
      <div className="px-6 pt-4">
        <CalendarPanel
          collection={collection as CollectionStrain[]}
          selectedDate={selectedDate || null}
          onDateSelect={handleDateSelect}
          isOpen={isCalendarOpen}
          onToggle={() => setIsCalendarOpen(v => !v)}
        />
      </div>

      <div className="px-6 py-6">
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

      {/* FAB: Navigate to strains page to add new strains */}
      <Link href="/strains" className="fixed bottom-28 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[#00F5FF] to-[#00e5ee] flex items-center justify-center shadow-lg shadow-[#00F5FF]/30 hover:scale-110 transition-transform z-40" aria-label="Neue Sorte hinzufügen">
        <Plus size={24} className="text-black font-bold" />
      </Link>

      <Suspense fallback={null}>
        <FilterPanel open={filterPanelOpen} onOpenChange={setFilterPanelOpen} />
      </Suspense>

      <BottomNav />
    </main>
  );
}
