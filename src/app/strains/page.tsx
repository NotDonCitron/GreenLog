"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Trophy, Lock, AlertCircle, Leaf } from "lucide-react";
import Link from "next/link";
import { Strain } from "@/lib/types";

export default function StrainsPage() {
  const { user, isDemoMode } = useAuth();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [userCollection, setUserCollection] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const filteredStrains = strains.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white pb-32">
      <header className="p-8 sticky top-0 bg-[#0e0e0f]/90 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-end mb-6">
          <div>
            <span className="text-[10px] text-[#00F5FF] font-black uppercase tracking-[0.4em]">Sticker Album</span>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">The 20 Legends</h1>
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
            {filteredStrains.map((strain) => {
              const isCollected = userCollection.includes(strain.id);
              return (
                <Link key={strain.id} href={`/strains/${strain.slug}`}>
                  <Card className={`relative bg-[#1a191b] overflow-hidden transition-all duration-500 group active:scale-95 ${
                    isCollected 
                      ? 'border-[#00F5FF]/50 shadow-[0_0_20px_rgba(0,245,255,0.15)]' 
                      : 'border-white/5 opacity-60'
                  }`}>
                    {!isCollected && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-grayscale">
                        <Lock className="text-white/20" size={24} />
                      </div>
                    )}

                    <div className={`aspect-[4/5] relative ${!isCollected ? 'grayscale brightness-50' : ''}`}>
                      {strain.image_url ? (
                        <img src={strain.image_url} alt={strain.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#1a191b] to-black flex items-center justify-center">
                          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                          <Leaf className="text-white/5" size={64} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1a191b] via-transparent to-transparent" />
                      {isCollected && <div className="absolute inset-0 card-holo opacity-30 animate-pulse" />}
                    </div>

                    <div className="p-3 relative bg-[#1a191b]">
                      <h3 className={`font-black text-[11px] uppercase tracking-tight truncate ${isCollected ? 'text-white' : 'text-white/40'}`}>
                        {strain.name}
                      </h3>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[8px] text-white/30 font-mono">#{strain.id.toString().slice(0,4)}</span>
                        {isCollected && <Trophy size={10} className="text-[#2FF801]" />}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
