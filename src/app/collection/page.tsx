"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Strain } from "@/lib/types";
import { Loader2, ChevronLeft, LayoutGrid, List as ListIcon, Search, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const DEMO_SIMULATION_DATA: Strain[] = [
  { id: "sim-1" as any, name: "Aurora Ghost Train Haze", brand: "Aurora", slug: "godfather-og", thc_max: 34, type: "sativa", terpenes: ["Terpinolene", "Myrcene", "Limonene"], effects: ["Energy"], image_url: "/strains/godfather-og.jpg", is_medical: true },
  { id: "sim-2" as any, name: "420 Pharma Kush Mint", brand: "420 Pharma", slug: "animal-face", thc_max: 30, type: "hybrid", terpenes: ["Limonene", "Caryophyllene"], effects: ["Relaxation"], image_url: "/strains/animal-face.jpg", is_medical: true },
  { id: "sim-3" as any, name: "Tilray Master Kush", brand: "Tilray", slug: "gmo-cookies", thc_max: 33, type: "indica", terpenes: ["Myrcene", "Limonene"], effects: ["Sleep"], image_url: "/strains/gmo-cookies.jpg", is_medical: true },
  { id: "sim-4" as any, name: "Gorilla Glue #4", brand: "DNA Genetics", slug: "gorilla-glue-4", thc_max: 28, type: "hybrid", image_url: "/strains/placeholder-1.svg", is_medical: true },
  { id: "sim-5" as any, name: "Amnesia Haze", brand: "Sensi Seeds", slug: "amnesia-haze", thc_max: 22, type: "sativa", image_url: "/strains/placeholder-1.svg", is_medical: false }
];

export default function CollectionPage() {
  const { user, loading: authLoading, isDemoMode } = useAuth();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function fetchUserCollection() {
      if (isDemoMode) {
        setStrains(DEMO_SIMULATION_DATA);
        setLoading(false);
        return;
      }
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('ratings')
        .select(`
          review,
          overall_rating,
          created_at,
          strain:strains (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) console.error("Error fetching collection:", error);

      if (data && data.length > 0) {
        const userStrains = data
          .map(item => {
            const s = item.strain as any;
            if (!s) return null;
            return {
              ...s,
              image_url: s.image_url || `/strains/${s.slug}.jpg`
            };
          })
          .filter(Boolean) as unknown as Strain[];
        
        setStrains(userStrains);
      } else {
        setStrains([]);
      }
      setLoading(false);
    }
    if (!authLoading) fetchUserCollection();
  }, [user, authLoading, isDemoMode]);

  const filteredStrains = strains.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.brand && s.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getCannabinoidDisplay = (primary?: number, secondary?: number) => {
    const value = primary ?? secondary;
    return typeof value === "number" ? `${value}%` : "—";
  };

  if (loading || authLoading) return <div className="min-h-screen bg-[#355E3B] flex items-center justify-center"><Loader2 className="animate-spin text-[#00F5FF]" size={40} /></div>;

  return (
    <main className="min-h-screen bg-[#355E3B] text-white pb-32">
      <header className="p-6 sticky top-0 bg-[#355E3B]/90 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition">
              <ChevronLeft size={20} />
            </button>
            <div>
              <span className="text-[10px] text-[#00FFFF] font-black uppercase tracking-[0.4em]">My Vault</span>
              <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none font-serif">Gesamte Collection</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#00FFFF]/20 text-[#00FFFF]' : 'text-white/40'}`}>
              <LayoutGrid size={20} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#00FFFF]/20 text-[#00FFFF]' : 'text-white/40'}`}>
              <ListIcon size={20} />
            </button>
          </div>
        </div>

        <div className="relative mt-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
          <input 
            type="text" 
            placeholder="Suchen (z.B. Indica, Pharma...)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121212] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#00FFFF]/50 shadow-inner"
          />
        </div>
      </header>

      <div className="p-6">
        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-6 font-bold">{filteredStrains.length} Strains gefunden</p>

        {strains.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/10 shadow-xl"><Star className="text-white/20" size={24} /></div>
            <div>
              <h2 className="text-lg font-bold uppercase tracking-tight">Sammlung leer</h2>
              <p className="text-white/40 text-[10px] uppercase mt-1">Gehe zum Katalog um Strains hinzuzufügen</p>
            </div>
            <Link href="/strains">
              <button className="px-6 py-3 mt-2 bg-[#00FFFF] text-black font-black rounded-xl uppercase tracking-widest text-[10px] hover:bg-white transition-all shadow-[0_0_15px_rgba(0,255,255,0.4)]">Zum Katalog</button>
            </Link>
          </div>
        ) : (
          viewMode === 'grid' ? (
            /* COMPACT GRID VIEW */
            <div className="grid grid-cols-2 gap-4">
              {filteredStrains.map((strain, i) => (
                <Link href={`/strains/${strain.slug}`} key={strain.id} className="bg-[#121212] rounded-xl border border-white/10 overflow-hidden relative shadow-lg hover:border-[#00FFFF]/50 transition-colors animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}>
                  <div className="h-32 w-full relative">
                    <img src={strain.image_url || "/strains/placeholder-1.svg"} alt={strain.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between">
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-sm uppercase tracking-widest font-bold border ${strain.type === 'sativa' ? 'border-yellow-500 text-yellow-500' : strain.type === 'indica' ? 'border-emerald-500 text-emerald-500' : 'border-[#00FFFF] text-[#00FFFF]'}`}>
                        {strain.type || 'Hybrid'}
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-serif italic font-bold text-sm leading-tight line-clamp-1">{strain.name}</h3>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-white/40 text-[9px] uppercase font-bold tracking-widest">THC</span>
                      <span className="text-[#00FFFF] text-xs font-bold">{getCannabinoidDisplay(strain.avg_thc, strain.thc_max)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            /* HORIZONTAL LIST VIEW */
            <div className="flex flex-col gap-3">
              {filteredStrains.map((strain, i) => (
                <Link href={`/strains/${strain.slug}`} key={strain.id} className="bg-[#121212] border border-white/5 rounded-2xl p-2 flex items-center gap-4 hover:bg-white/5 hover:border-[#00FFFF]/30 transition-colors animate-in fade-in slide-in-from-bottom-4 shadow-lg" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}>
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative">
                    <img src={strain.image_url || "/strains/placeholder-1.svg"} alt={strain.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif italic font-bold text-sm leading-tight truncate">{strain.name}</h3>
                    <div className="flex gap-2 mt-1 items-center">
                      <span className="text-[9px] text-white font-bold uppercase tracking-widest">THC {getCannabinoidDisplay(strain.avg_thc, strain.thc_max)}</span>
                      <span className="text-[9px] text-white/40 uppercase tracking-widest">•</span>
                      <span className={`text-[9px] uppercase tracking-widest font-bold ${strain.type === 'sativa' ? 'text-yellow-500' : strain.type === 'indica' ? 'text-emerald-500' : 'text-[#00FFFF]'}`}>
                        {strain.type || 'Hybrid'}
                      </span>
                    </div>
                  </div>
                  <div className="pr-2 text-white/20">
                    <ChevronLeft size={16} className="rotate-180" />
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>

      <BottomNav />
    </main>
  );
}
