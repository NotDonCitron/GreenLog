"use client";

import { useState, useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { Search, CalendarDays, Loader2, AlertCircle, X, Filter } from "lucide-react";
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
  { id: "pharmacy", label: "🧪 Apotheke" },
  { id: "grow", label: "🌱 Eigenanbau" },
  { id: "csc", label: "🏢 CSC" },
  { id: "other", label: "📦 Sonstiges" },
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
        // Wir holen alle Sorten inkl. user_image_url
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
    <main className="min-h-screen bg-white text-black pb-32">
      <header className="p-8 sticky top-0 bg-black/90 backdrop-blur-xl z-50 border-b border-black/5">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Deine Sammlung</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-black/40 uppercase font-bold">Anzahl</p>
            <p className="text-xl font-black text-[#2FF801]">{strains.length}</p>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 text-black/20" size={18} />
            <input
              type="text"
              placeholder="In Sammlung suchen..."
              className="w-full bg-black/5 border border-black/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-[#00F5FF]/50 transition-all shadow-inner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setIsCalendarOpen(true)}
            className={`h-12 w-12 rounded-2xl border-black/10 shrink-0 transition-all ${selectedDate ? 'bg-[#2FF801] border-[#2FF801] text-black' : 'bg-black/5 text-[#2FF801]'}`}
          >
            <CalendarDays size={20} />
          </Button>
        </div>

        {selectedDate && (
          <div className="flex items-center justify-between bg-[#2FF801]/10 border border-[#2FF801]/20 rounded-xl px-4 py-2 mb-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Filter size={12} className="text-[#2FF801]" />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#2FF801]">
                Gefiltert: {format(selectedDate, "dd. MMMM yyyy", { locale: de })}
              </p>
            </div>
            <button onClick={() => setSelectedDate(undefined)} className="text-[#2FF801] hover:text-black transition-colors">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex gap-2 mt-2 overflow-x-auto pb-1 -mx-1 px-1">
          {SOURCE_FILTERS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={sourceFilter === f.id ? "default" : "outline"}
              onClick={() => setSourceFilter(f.id)}
              className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${sourceFilter === f.id
                ? "bg-[#2FF801] text-black"
                : "bg-black/5 border-black/10 text-black/60"
                }`}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </header>

      <div className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
            <p className="text-[10px] font-bold text-black/20 uppercase tracking-[0.2em]">Lade Archiv...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-red-400">
            <AlertCircle size={40} />
            <p className="text-sm font-bold uppercase tracking-widest">{error}</p>
          </div>
        ) : filteredStrains.length > 0 ? (
          <div className="grid grid-cols-2 gap-6">
            {filteredStrains.map((strain, i) => (
              <StrainCard key={strain.id} strain={strain} index={i} isCollected={true} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-black/20 font-bold uppercase tracking-widest text-sm">Keine Treffer in der Sammlung</p>
          </div>
        )}
      </div>

      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="max-w-[360px] w-[95vw] bg-[#1a191b] border-black/10 text-black rounded-[2.5rem] p-6 flex flex-col items-center shadow-2xl">
          <DialogHeader className="w-full mb-4">
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-[#2FF801] text-center">Archiv Datum</DialogTitle>
          </DialogHeader>

          <div className="w-full bg-black/20 rounded-3xl p-2 border border-black/5 shadow-inner">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setIsCalendarOpen(false);
              }}
              initialFocus
            />
          </div>

          {selectedDate && (
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedDate(undefined);
                setIsCalendarOpen(false);
              }}
              className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#2FF801] hover:bg-[#2FF801]/10 h-10 w-full rounded-xl"
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
