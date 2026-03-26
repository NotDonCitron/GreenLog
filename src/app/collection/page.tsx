"use client";

import { useState, useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { Search, CalendarDays, Loader2, AlertCircle, X, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Strain, StrainSource } from "@/lib/types";
import { StrainCard } from "@/components/strains/strain-card";
import { Calendar } from "@/components/ui/calendar";
import { normalizeCollectionSource } from "@/lib/strain-display";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export default function CollectionPage() {
  const { user, loading: authLoading } = useAuth();
  const [strains, setStrains] = useState<CollectionStrain[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<StrainSource | "all">("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCollection() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('user_collection')
          .select(`
            batch_info,
            user_notes,
            user_thc_percent,
            user_cbd_percent,
            user_image_url,
            date_added,
            strain:strains (*)
          `)
          .eq('user_id', user.id);

        if (fetchError) throw fetchError;

        if (data) {
          const userStrains = (data as unknown as CollectionRow[]).reduce<CollectionStrain[]>((acc, item) => {
            const rawStrain = Array.isArray(item.strain) ? item.strain[0] : item.strain;
            if (!rawStrain) {
              return acc;
            }

            const normalizedSource = normalizeCollectionSource(item.batch_info || rawStrain.source);

            acc.push({
              ...rawStrain,
              image_url: item.user_image_url || rawStrain.image_url || undefined,
              source: normalizedSource,
              avg_thc: item.user_thc_percent ?? rawStrain.avg_thc ?? rawStrain.thc_max ?? undefined,
              avg_cbd: item.user_cbd_percent ?? rawStrain.avg_cbd ?? rawStrain.cbd_max ?? undefined,
              user_notes: item.user_notes,
              collected_at: item.date_added,
            });

            return acc;
          }, []);

          setStrains(userStrains);
        }
      } catch (err: unknown) {
        console.error("Collection fetch error:", err);
        setError(err instanceof Error ? err.message : "Unbekannter Fehler beim Laden der Sammlung.");
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) fetchCollection();
  }, [user, authLoading]);

  const filteredStrains = strains.filter(s => {
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

    return matchesSearch && matchesSource && matchesDate;
  });

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white pb-32">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[100px] rounded-full" />
      </div>

      <header className="sticky top-0 z-50 glass-surface border-b border-[#484849]/30 px-6 pt-12 pb-4">
        <div className="flex justify-between items-end mb-5">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none font-display text-white">
              Sammlung
            </h1>
            <p className="text-[10px] text-[#adaaab] uppercase tracking-[0.2em] mt-1 font-medium">
              Deine Strains
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#adaaab] uppercase font-semibold tracking-wider">Anzahl</p>
            <p className="text-2xl font-black text-[#2FF801] neon-text-green font-display">{strains.length}</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#adaaab]" size={18} />
          <input
            type="text"
            placeholder="In Sammlung suchen..."
            className="w-full bg-[#131314] border border-[#484849]/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-[#484849] focus:outline-none focus:border-[#00F5FF]/50 focus:ring-1 focus:ring-[#00F5FF]/30 transition-all"
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
                  : "bg-[#1a191b] text-[#adaaab] border border-[#484849]/50 hover:border-[#00F5FF]/50"
              }`}
            >
              {f.label}
            </button>
          ))}
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
            <button onClick={() => setSelectedDate(undefined)} className="text-[#00F5FF] hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        )}
      </header>

      <div className="px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
              <div className="absolute inset-0 blur-xl bg-[#00F5FF]/20 animate-pulse" />
            </div>
            <p className="text-[10px] font-bold text-[#adaaab] uppercase tracking-[0.2em]">Lade Archiv...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-[#ff716c]">
            <AlertCircle size={40} />
            <p className="text-sm font-bold uppercase tracking-widest">{error}</p>
          </div>
        ) : filteredStrains.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredStrains.map((strain, i) => (
              <StrainCard key={strain.id} strain={strain} index={i} isCollected={true} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#1a191b] border border-[#484849]/50 flex items-center justify-center">
              <span className="text-4xl">🌿</span>
            </div>
            <p className="text-[#adaaab] font-bold uppercase tracking-widest text-sm">Keine Treffer</p>
            <p className="text-[#484849] text-xs mt-2">Füge neue Strains hinzu</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fixed bottom-28 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[#00F5FF] to-[#00e5ee] flex items-center justify-center shadow-lg shadow-[#00F5FF]/30 hover:scale-110 transition-transform z-40">
        <Plus size={24} className="text-black font-bold" />
      </button>

      {/* Calendar Dialog */}
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="max-w-[360px] w-[95vw] bg-[#1a191b] border border-[#484849]/50 text-white rounded-3xl p-6 flex flex-col items-center">
          <DialogHeader className="w-full mb-4">
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-[#2FF801] text-center font-display">
              Archiv Datum
            </DialogTitle>
          </DialogHeader>

          <div className="w-full bg-[#131314] rounded-2xl p-2 border border-[#484849]/50">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setIsCalendarOpen(false);
              }}
              initialFocus
              className="text-white"
            />
          </div>

          {selectedDate && (
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedDate(undefined);
                setIsCalendarOpen(false);
              }}
              className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#00F5FF] hover:bg-[#00F5FF]/10 h-10 w-full rounded-xl border border-[#484849]/50"
            >
              Filter zurücksetzen
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </main>
  );
}
