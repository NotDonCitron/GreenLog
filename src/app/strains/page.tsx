"use client";

import { useState, useEffect, Suspense, useCallback, lazy, useRef, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { strainKeys } from "@/lib/query-keys";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Search, Loader2, AlertCircle, Plus, Camera, SlidersHorizontal, Scale, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Strain, StrainSource } from "@/lib/types";
import { useCollection } from "@/hooks/useCollection";
import { CreateStrainModal } from "@/components/strains/create-strain-modal";
import { StrainCard } from "@/components/strains/strain-card";
const FilterPanel = lazy(() => import("@/components/strains/filter-panel").then(m => ({ default: m.FilterPanel })));
import { ActiveFilterBadges } from "@/components/strains/active-filter-badges";
import { THC_RANGE, CBD_RANGE, MAX_COMPARE_STRAINS } from "@/lib/constants";

const SOURCE_OVERRIDE_STORAGE_KEY = "greenlog:strain-source-overrides";
const STRAINS_PAGE_SIZE = 50;

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

function FilterParamReader({
  onFiltersReady,
}: {
  onFiltersReady: (effects: string[], thcMin: number, thcMax: number, cbdMin: number, cbdMax: number, flavors: string[]) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const effects = searchParams.get("effects")?.split(",").filter(Boolean) || [];
    const thcMin = Number(searchParams.get("thc_min") || THC_RANGE.min);
    const thcMax = Number(searchParams.get("thc_max") || THC_RANGE.max);
    const cbdMin = Number(searchParams.get("cbd_min") || CBD_RANGE.min);
    const cbdMax = Number(searchParams.get("cbd_max") || CBD_RANGE.max);
    const flavors = searchParams.get("flavors")?.split(",").filter(Boolean) || [];
    onFiltersReady(effects, thcMin, thcMax, cbdMin, cbdMax, flavors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  return null;
}

export default function StrainsPage() {
  return (
    <Suspense fallback={null}>
      <StrainsPageContent />
    </Suspense>
  );
}

function StrainsPageContent() {
  const { user, isDemoMode, activeOrganization } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<StrainSource | "all" | "mine">("all");
  const [activeTab, setActiveTab] = useState<"catalog" | "org">("catalog");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterEffects, setFilterEffects] = useState<string[]>([]);
  const [filterThcMin, setFilterThcMin] = useState(THC_RANGE.min);
  const [filterThcMax, setFilterThcMax] = useState(THC_RANGE.max);
  const [filterCbdMin, setFilterCbdMin] = useState(CBD_RANGE.min);
  const [filterCbdMax, setFilterCbdMax] = useState(CBD_RANGE.max);
  const [filterFlavors, setFilterFlavors] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const compareSlugs = useMemo(
    () => searchParams.get("compare")?.split(",").filter(Boolean) || [],
    [searchParams],
  );
  const { collectedIds } = useCollection();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [totalStrainCount, setTotalStrainCount] = useState(0);
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(true);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasCompareSelection = compareSlugs.length >= 2;

  // Debounce search input by 300ms to avoid excessive Supabase queries
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleCompare = useCallback((slug: string) => {
    const current = compareSlugs;
    let next: string[];
    if (current.includes(slug)) {
      next = current.filter(s => s !== slug);
    } else if (current.length < MAX_COMPARE_STRAINS) {
      next = [...current, slug];
    } else {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (next.length === 0) {
      params.delete("compare");
    } else {
      params.set("compare", next.join(","));
    }
    void router.push(`?${params.toString()}`, { scroll: false });
  }, [compareSlugs, searchParams, router]);

  const clearCompare = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("compare");
    void router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleFiltersReady = useCallback((effects: string[], thcMin: number, thcMax: number, cbdMin: number, cbdMax: number, flavors: string[]) => {
    setFilterEffects(effects);
    setFilterThcMin(thcMin);
    setFilterThcMax(thcMax);
    setFilterCbdMin(cbdMin);
    setFilterCbdMax(cbdMax);
    setFilterFlavors(flavors);
  }, []);

  const persistSourceOverride = (strainId: string, strainSource: StrainSource) => {
    try {
      const stored = window.localStorage.getItem(SOURCE_OVERRIDE_STORAGE_KEY);
      const current: Record<string, StrainSource> = stored ? JSON.parse(stored) : {};
      const next = { ...current, [strainId]: strainSource };
      window.localStorage.setItem(SOURCE_OVERRIDE_STORAGE_KEY, JSON.stringify(next));
    } catch (storageError) {
      console.warn("[StrainsPage] Failed to persist source override", {
        strainId,
        strainSource,
        storageError,
      });
    }
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
      const isCreator = user?.id && strain.created_by === user.id;
      return strain.source === "grow" || isCreator;
    }

    if (sourceFilter === "other") {
      return strain.source === "other" || strain.source === "street";
    }

    return strain.source === sourceFilter;
  };

  // Query key includes all filter state for automatic refetch on changes
  const filters = {
    search: debouncedSearch,
    activeTab,
    organizationId: activeOrganization?.organization_id,
    effects: filterEffects,
    thcMin: filterThcMin,
    thcMax: filterThcMax,
    cbdMin: filterCbdMin,
    cbdMax: filterCbdMax,
    flavors: filterFlavors,
    sourceFilter,
  };

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: strainKeys.list(filters),
    queryFn: ({ pageParam }) => fetchStrains(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const strains = data?.pages.flatMap((page) => page.strains) ?? [];

  // Store totalCount from first page fetch (catalog-wide count, does not change with filters/scroll)
  useEffect(() => {
    if (data?.pages[0]?.totalCount) {
      setTimeout(() => setTotalStrainCount(data.pages[0].totalCount), 0);
    }
  }, [data]);

  // Infinite scroll trigger
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  async function fetchStrains(pageParam?: number): Promise<{ strains: Strain[]; nextCursor?: number; totalCount: number }> {
    // Demo mode: return mock strains without Supabase calls
    if (isDemoMode) {
      const mockStrains: Strain[] = [
        {
          id: 'demo-1',
          slug: 'gorilla-glue',
          name: 'Gorilla Glue #4',
          type: 'hybrid' as const,
          source: 'pharmacy' as StrainSource,
          effects: ['relaxing', 'euphoric'],
          flavors: ['earthy', 'chocolate'],
          terpenes: ['Caryophyllene', 'Myrcene', 'Limonene'],
          created_by: undefined,
          organization_id: null,
          image_url: undefined,
          thc_max: 28,
          cbd_max: 1,
        },
        {
          id: 'demo-2',
          slug: 'sour-diesel',
          name: 'Sour Diesel',
          type: 'sativa' as const,
          source: 'pharmacy' as StrainSource,
          effects: ['energetic', 'uplifting'],
          flavors: ['citrus', 'diesel'],
          terpenes: ['Limonene', 'Myrcene'],
          created_by: undefined,
          organization_id: null,
          image_url: undefined,
          thc_max: 22,
          cbd_max: 1,
        },
        {
          id: 'demo-3',
          slug: 'blue-dream',
          name: 'Blue Dream',
          type: 'hybrid' as const,
          source: 'pharmacy' as StrainSource,
          effects: ['relaxing', 'creative'],
          flavors: ['berry', 'vanilla'],
          terpenes: [],
          created_by: undefined,
          organization_id: null,
          image_url: undefined,
          thc_max: 20,
          cbd_max: 1,
        },
      ];
      return { strains: mockStrains, nextCursor: undefined, totalCount: mockStrains.length };
    }

    // Load source overrides from localStorage
    let localSourceOverrides: Record<string, StrainSource> = {};
    try {
      const stored = window.localStorage.getItem(SOURCE_OVERRIDE_STORAGE_KEY);
      if (stored) localSourceOverrides = JSON.parse(stored);
    } catch {
      // ignore
    }

    const offset = pageParam ?? 0;

    // Build query with server-side filters
    let strainsQuery = supabase
      .from('strains')
      .select('*', { count: 'exact' });

    // Tab filter (catalog vs org)
    if (activeTab === 'catalog') {
      strainsQuery = strainsQuery.is('organization_id', null);
    } else if (activeOrganization) {
      strainsQuery = strainsQuery.eq('organization_id', activeOrganization.organization_id);
    }

    // Search filter (server-side ILIKE)
    if (debouncedSearch) {
      strainsQuery = strainsQuery.ilike('name', `%${debouncedSearch}%`);
    }

    // Effects filter: strain must have ALL selected effects (PostgreSQL array contains)
    if (filterEffects.length > 0) {
      strainsQuery = strainsQuery.contains('effects', filterEffects);
    }

    // THC filter (server-side range)
    const thcMin = filterThcMin > THC_RANGE.min ? filterThcMin : undefined;
    const thcMax = filterThcMax < THC_RANGE.max ? filterThcMax : undefined;
    if (thcMin !== undefined) {
      strainsQuery = strainsQuery.gte('thc_max', thcMin);
    }
    if (thcMax !== undefined) {
      strainsQuery = strainsQuery.lte('thc_min', thcMax);
    }

    // CBD filter (server-side range)
    const cbdMin = filterCbdMin > CBD_RANGE.min ? filterCbdMin : undefined;
    const cbdMax = filterCbdMax < CBD_RANGE.max ? filterCbdMax : undefined;
    if (cbdMin !== undefined) {
      strainsQuery = strainsQuery.gte('cbd_max', cbdMin);
    }
    if (cbdMax !== undefined) {
      strainsQuery = strainsQuery.lte('cbd_min', cbdMax);
    }

    // Flavors filter: strain must have ALL selected flavors
    if (filterFlavors.length > 0) {
      strainsQuery = strainsQuery.contains('flavors', filterFlavors);
    }

    // Apply pagination last
    strainsQuery = strainsQuery
      .order('name')
      .range(offset, offset + STRAINS_PAGE_SIZE - 1);

    const { data: pageStraings, error: strainError, count } = await strainsQuery;

    if (strainError) throw new Error(strainError.message);

    const mergedOverrides = { ...localSourceOverrides };
    const mergedImageOverrides: Record<string, string | null> = {};
    if (user) {
      const { data: collectionSettings } = await supabase
        .from('user_collection')
        .select('strain_id, batch_info, user_image_url')
        .eq('user_id', user.id);

      if (collectionSettings) {
        collectionSettings.forEach((item: { strain_id: string; batch_info: string | null; user_image_url: string | null }) => {
          if (['apotheke', 'street', 'grow', 'pharmacy'].includes(item.batch_info || '')) {
            mergedOverrides[item.strain_id] = item.batch_info as StrainSource;
          }
          if (item.user_image_url) {
            mergedImageOverrides[item.strain_id] = item.user_image_url;
          }
        });
        // Persist merged overrides to localStorage
        try {
          window.localStorage.setItem(SOURCE_OVERRIDE_STORAGE_KEY, JSON.stringify(mergedOverrides));
        } catch {
          // ignore
        }
      }
    }

    let normalizedStrains = (pageStraings ?? []).map((strain) => ({
      ...strain,
      source: strain.source ?? mergedOverrides[strain.id] ?? 'pharmacy',
      image_url: mergedImageOverrides[strain.id] ?? strain.image_url,
    }));

    // Source filter still needs client-side (custom logic with overrides)
    if (sourceFilter !== 'all') {
      normalizedStrains = normalizedStrains.filter(matchesSourceFilter);
    }

    const hasMore = (count ?? 0) > offset + STRAINS_PAGE_SIZE;
    return { strains: normalizedStrains as Strain[], nextCursor: hasMore ? offset + STRAINS_PAGE_SIZE : undefined, totalCount: count ?? 0 };
  }

  // Hide search bar when scrolling down, show when scrolling up or at top
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      if (currentScrollY <= 50) {
        setIsSearchBarVisible(true);
      } else if (currentScrollY > lastScrollY.current + 5) {
        setIsSearchBarVisible(false);
      } else if (currentScrollY < lastScrollY.current - 5) {
        setIsSearchBarVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main ref={scrollContainerRef} className={`min-h-screen bg-[var(--background)] text-[var(--foreground)] overflow-y-auto ${hasCompareSelection ? "pb-52" : "pb-32"}`}>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
      </div>

      <Suspense fallback={null}>
        <TabParamReader
          activeOrganization={activeOrganization}
          onTabReady={(tab) => setActiveTab(tab)}
        />
        <FilterParamReader
          onFiltersReady={handleFiltersReady}
        />
      </Suspense>

      <header className="sticky top-0 z-50 glass-surface border-b border-[var(--border)]/50">
        <div className="px-6 pt-12 pb-2">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">Strains</h1>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--muted-foreground)] uppercase font-bold tracking-wider">Progress</p>
              <p className="text-xl font-black text-[#2FF801] neon-text-green font-display">{collectedIds.length} / {totalStrainCount || strains.length || 20}</p>
            </div>
          </div>
        </div>

        <div className={`px-6 pb-4 transition-transform duration-300 ${isSearchBarVisible ? "translate-y-0" : "-translate-y-full"}`}>
          <div className="relative mb-4">
            <Search className="absolute left-4 top-3.5 text-[#484849]" size={18} />
            <input
              type="text"
              placeholder="Sorte suchen..."
              className="w-full bg-[var(--input)] border border-[var(--border)]/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-[var(--foreground)] placeholder:text-[#484849] focus:outline-none focus:border-[#00F5FF]/50 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            <button
              onClick={() => setActiveTab("catalog")}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${activeTab === "catalog"
                ? "bg-[#2FF801] text-black"
                : "bg-[var(--card)] border border-[var(--border)]/50 text-[var(--muted-foreground)] hover:border-[#00F5FF]/50"
                }`}
            >
              Katalog
            </button>
            {activeOrganization && (
              <button
                onClick={() => setActiveTab("org")}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${activeTab === "org"
                  ? "bg-[#00F5FF] text-black"
                  : "bg-[var(--card)] border border-[var(--border)]/50 text-[var(--muted-foreground)] hover:border-[#00F5FF]/50"
                  }`}
              >
                {activeOrganization.organizations?.name || "Organisation"}
              </button>
            )}
          </div>

          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            <Button
              size="sm"
              variant={sourceFilter === "all" ? "default" : "outline"}
              onClick={() => setSourceFilter("all")}
              className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === "all" ? "bg-[#2FF801] text-black" : "bg-[var(--card)] border border-[var(--border)]/50 text-[var(--muted-foreground)]"}`}
            >
              Alle
            </Button>
            <Button
              size="sm"
              variant={sourceFilter === "pharmacy" ? "default" : "outline"}
              onClick={() => setSourceFilter("pharmacy")}
              className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === "pharmacy" ? "bg-[#2FF801] text-black" : "bg-[var(--card)] border border-[var(--border)]/50 text-[var(--muted-foreground)]"}`}
            >
              Apotheke
            </Button>
            <Button
              size="sm"
              variant={sourceFilter === "grow" ? "default" : "outline"}
              onClick={() => setSourceFilter("grow")}
              className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === "grow" ? "bg-[#2FF801] text-black" : "bg-[var(--card)] border border-[var(--border)]/50 text-[var(--muted-foreground)]"}`}
            >
              Eigenanbau
            </Button>
            <Button
              size="sm"
              variant={sourceFilter === "csc" ? "default" : "outline"}
              onClick={() => setSourceFilter("csc")}
              className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === "csc" ? "bg-[#2FF801] text-black" : "bg-[var(--card)] border border-[var(--border)]/50 text-[var(--muted-foreground)]"}`}
            >
              CSC
            </Button>
            <Button
              size="sm"
              variant={sourceFilter === "other" ? "default" : "outline"}
              onClick={() => setSourceFilter("other")}
              className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === "other" ? "bg-[#2FF801] text-black" : "bg-[var(--card)] border border-[var(--border)]/50 text-[var(--muted-foreground)]"}`}
            >
              Sonstiges
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFilterPanelOpen(true)}
            className="bg-[var(--card)] border border-[var(--border)]/50 text-[var(--muted-foreground)] hover:border-[#00F5FF]/50"
          >
            <SlidersHorizontal size={14} className="mr-1" />
            Filter
          </Button>
        </div>
      </header>

      <Suspense fallback={null}>
        <ActiveFilterBadges
          effects={filterEffects}
          thcMin={filterThcMin}
          thcMax={filterThcMax}
          cbdMin={filterCbdMin}
          cbdMax={filterCbdMax}
        />
      </Suspense>

      <div className="p-6 relative z-10">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-[#ff716c]">
            <AlertCircle size={48} />
            <p className="text-sm font-bold uppercase tracking-widest text-center">{error instanceof Error ? error.message : String(error)}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-xl bg-[#ff716c]/10 border border-[#ff716c]/30 text-[#ff716c] text-xs font-bold uppercase tracking-widest hover:bg-[#ff716c]/20 transition-all"
            >
              Retry
            </button>
          </div>
        ) : isLoading && strains.length === 0 ? (
          <div className="grid grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4.5] rounded-3xl bg-[var(--card)] border border-[var(--border)]/50 animate-pulse flex flex-col p-4 gap-4">
                <div className="w-2/3 h-6 bg-[var(--muted)] rounded-lg" />
                <div className="w-full flex-1 bg-[var(--muted)] rounded-xl" />
                <div className="w-full h-12 bg-[var(--muted)] rounded-xl mt-auto" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-6">
              {strains.map((strain, i) => {
                const isCollected = collectedIds.includes(strain.id);
                const isSelected = compareSlugs.includes(strain.slug);
                return (
                  <div
                    key={strain.id}
                    className="relative"
                    onContextMenu={(e) => { e.preventDefault(); void toggleCompare(strain.slug); }}
                    onClick={() => { if (isSelected) void toggleCompare(strain.slug); }}
                    title={isSelected ? "Aus Vergleich entfernen (Rechtsklick)" : "Zum Vergleich (Rechtsklick)"}
                  >
                    <StrainCard strain={strain} index={i} isCollected={isCollected} />
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-30 w-6 h-6 bg-[#2FF801] rounded-full flex items-center justify-center shadow-lg">
                        <Scale size={12} className="text-black" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {hasNextPage && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {isFetchingNextPage ? (
                  <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <Loader2 className="animate-spin" size={20} />
                    <span className="text-xs font-bold uppercase tracking-widest">Lade mehr...</span>
                  </div>
                ) : (
                  <button
                    onClick={() => void fetchNextPage()}
                    className="px-6 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)]/50 text-[var(--muted-foreground)] text-xs font-bold uppercase tracking-widest hover:border-[#00F5FF]/50 transition-all"
                  >
                    Mehr laden
                  </button>
                )}
              </div>
            )}
            {isFetchingNextPage && (
              <div className="grid grid-cols-2 gap-6 mt-6">
                {[...Array(4)].map((_, i) => (
                  <div key={`skeleton-${i}`} className="aspect-[3/4.5] rounded-3xl bg-[var(--card)] border border-[var(--border)]/50 animate-pulse flex flex-col p-4 gap-4">
                    <div className="w-2/3 h-6 bg-[var(--muted)] rounded-lg" />
                    <div className="w-full flex-1 bg-[var(--muted)] rounded-xl" />
                    <div className="w-full h-12 bg-[var(--muted)] rounded-xl mt-auto" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {hasCompareSelection && (
        <div data-testid="strain-compare-bar" className="fixed bottom-24 left-4 right-4 z-40">
          <div className="bg-[#121212]/95 border border-[#2FF801]/30 rounded-2xl p-3 shadow-lg shadow-[#2FF801]/10 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Scale size={16} className="shrink-0 text-[#2FF801]" />
                <span className="truncate text-sm font-black text-white">
                  {compareSlugs.length} Strain{compareSlugs.length > 1 ? "s" : ""} gewählt
                </span>
              </div>
              <Link
                href={`/strains/compare?slugs=${compareSlugs.join(",")}`}
                className="flex shrink-0 items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-[#2FF801] to-[#2fe000] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-black transition-all hover:opacity-90"
              >
                <Scale size={12} />
                Vergleichen
              </Link>
              <button
                onClick={clearCompare}
                aria-label="Vergleichsauswahl leeren"
                className="shrink-0 rounded-full p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white/80"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        data-testid="strain-action-menu"
        className={`fixed right-6 z-50 flex flex-col items-end gap-3 transition-[bottom] duration-300 ${hasCompareSelection ? "bottom-44" : "bottom-24"}`}
      >
        {isActionMenuOpen && (
          <div className="flex flex-col items-end gap-2">
            <Link href="/scanner" onClick={() => setIsActionMenuOpen(false)}>
              <button aria-label="Strain per Foto hinzufügen" className="flex h-12 items-center gap-2 rounded-full bg-gradient-to-br from-[#00F5FF] to-[#00e5ee] px-4 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-[#00F5FF]/25 transition-transform active:scale-95">
                <Camera size={20} />
                Foto
              </button>
            </Link>
            <CreateStrainModal
              onSuccess={handleStrainCreated}
              trigger={
                <button
                  aria-label="Strain manuell hinzufügen"
                  className="flex h-12 items-center gap-2 rounded-full bg-gradient-to-br from-[#2FF801] to-[#2fe000] px-4 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-[#2FF801]/25 transition-transform active:scale-95"
                >
                  <Plus size={20} />
                  Manuell
                </button>
              }
            />
          </div>
        )}
        <button
          aria-label="Strain hinzufügen"
          aria-expanded={isActionMenuOpen}
          onClick={() => setIsActionMenuOpen((open) => !open)}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#2FF801] to-[#2fe000] text-black shadow-lg shadow-[#2FF801]/30 transition-transform active:scale-95"
        >
          <Plus size={30} className={`transition-transform duration-200 ${isActionMenuOpen ? "rotate-45" : "rotate-0"}`} />
        </button>
      </div>

      <Suspense fallback={null}>
        <FilterPanel open={filterPanelOpen} onOpenChange={setFilterPanelOpen} />
      </Suspense>

      <BottomNav />
    </main>
  );
}
