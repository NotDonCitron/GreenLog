"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Trophy, Lock, AlertCircle } from "lucide-react";
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
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout: Supabase is not responding")), 15000)
      );

      try {
        const { data: allStrains, error: strainError } = await Promise.race([
          supabase.from("strains").select("*").order("name"),
          timeoutPromise
        ]) as any;
        
        if (strainError) throw new Error(strainError.message);
        if (allStrains) setStrains(allStrains as Strain[]);

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
        setError(err.message || "Failed to load strains.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [user, isDemoMode]);

  const filteredStrains = strains.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const collectedCount = userCollection.length;

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
            <p className="text-xl font-black text-[#2FF801]">{collectedCount} / {strains.length || 20}</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-white/20" size={18} />
          <input 
            type="text" 
            placeholder="Search strains..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-[#00F5FF]/50 transition-all shadow-inner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="p-6">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-red-500 text-center">
            <AlertCircle size={48} />
            <p className="text-sm font-black uppercase tracking-widest px-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-8 py-3 bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all"
            >
              System Reset
            </button>
          </div>
        ) : loading && strains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-[#00F5FF]" size={48} />
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Initializing system...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {filteredStrains.map((strain) => {
              const isCollected = userCollection.includes(strain.id);
              return (
                <Link key={strain.id} href={`/strains/${strain.slug}`}>
                  <Card className={`relative bg-[#1a191b] overflow-hidden transition-all duration-500 group active:scale-95 ${
                    isCollected 
                      ? 'border-[#00F5FF]/50 shadow-[0_0_20px_rgba(0,245,255,0.15)] ring-1 ring-[#00F5FF]/30' 
                      : 'border-white/5 opacity-60'
                  }`}>
                    {!isCollected && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-grayscale">
                        <Lock className="text-white/20" size={24} />
                      </div>
                    )}

                    <div className={`aspect-[4/5] relative ${!isCollected ? 'grayscale brightness-50' : ''}`}>
                      <img src={strain.image_url} alt={strain.name} className="w-full h-full object-cover" />
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
