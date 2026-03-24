"use client";

import { useState, useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { Search, CalendarDays, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { Strain, StrainSource } from "@/lib/types";
import { StrainCard } from "@/components/strains/strain-card";

export default function CollectionPage() {
  const { user, loading: authLoading } = useAuth();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<StrainSource | "all">("all");
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
            strain:strains (*)
          `)
          .eq('user_id', user.id);

        if (fetchError) throw fetchError;

        if (data) {
          const userStrains = data
            .map(item => {
              const s = item.strain as any;
              if (!s) return null;
              return {
                ...s,
                // Persönliches Bild überschreibt globales Bild
                image_url: item.user_image_url || s.image_url,
                source: item.batch_info || s.source || 'pharmacy',
                avg_thc: item.user_thc_percent || s.avg_thc,
                avg_cbd: item.user_cbd_percent || s.avg_cbd,
                user_notes: item.user_notes
              };
            })
            .filter(Boolean) as unknown as Strain[];

          setStrains(userStrains);
        }
      } catch (err: any) {
        console.error("Collection fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) fetchCollection();
  }, [user, authLoading]);

  const filteredStrains = strains.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    // Filter-Logik: 'other' schließt 'street' mit ein
    const matchesFilter = sourceFilter === "all" || 
                         (sourceFilter === "other" ? (s.source === "other" || s.source === "street") : s.source === sourceFilter);
    return matchesSearch && matchesFilter;
  });

  return (
    <main className="min-h-screen bg-[#355E3B] text-white pb-32">
      <header className="p-8 sticky top-0 bg-[#355E3B]/90 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-end mb-6">
          <div>
            <span className="text-[10px] text-[#00F5FF] font-black uppercase tracking-[0.4em]">Archiv</span>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Deine Sammlung</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/40 uppercase font-bold">Anzahl</p>
            <p className="text-xl font-black text-[#2FF801]">{strains.length}</p>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 text-white/20" size={18} />
            <input
              type="text"
              placeholder="In Sammlung suchen..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-[#00F5FF]/50 transition-all shadow-inner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-12 w-12 rounded-2xl bg-white/5 border-white/10 shrink-0">
             <CalendarDays className="text-[#00F5FF]" size={20} />
          </Button>
        </div>

        <div className="flex gap-2 mt-2 overflow-x-auto pb-1 -mx-1 px-1">
          {[
            { id: "all", label: "Alle" },
            { id: "pharmacy", label: "🧪 Apotheke" },
            { id: "grow", label: "🌱 Eigenanbau" },
            { id: "csc", label: "🏢 CSC" },
            { id: "other", label: "📦 Sonstiges" }
          ].map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={sourceFilter === f.id ? "default" : "outline"}
              onClick={() => setSourceFilter(f.id as any)}
              className={`rounded-xl text-[10px] font-bold whitespace-nowrap ${
                sourceFilter === f.id 
                ? "bg-[#2FF801] text-black" 
                : "bg-white/5 border-white/10 text-white/60"
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
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Lade Archiv...</p>
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
            <p className="text-white/20 font-bold uppercase tracking-widest text-sm">Keine Treffer in der Sammlung</p>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
