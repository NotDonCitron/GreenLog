"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Trophy, Lock } from "lucide-react";
import Link from "next/link";

export default function StrainsPage() {
  const { user, isDemoMode } = useAuth();
  const [strains, setStrains] = useState<any[]>([]);
  const [userCollection, setUserCollection] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchData() {
      // 1. Alle Strains laden
      const { data: allStrains } = await supabase.from("strains").select("*").order("name");
      if (allStrains) setStrains(allStrains);

      // 2. User Collection laden
      if (user) {
        const { data: ratings } = await supabase.from("ratings").select("strain_id").eq("user_id", user.id);
        if (ratings) setUserCollection(ratings.map(r => r.strain_id));
      }
      
      // Demo Mode Support
      if (isDemoMode) {
        setUserCollection(allStrains?.slice(0, 3).map(s => s.id) || []);
      }

      setLoading(false);
    }
    fetchData();
  }, [user, isDemoMode]);

  const filteredStrains = strains.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const collectedCount = user ? userCollection.length : 0;

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white pb-32">
      {/* Album Header */}
      <header className="p-8 sticky top-0 bg-[#0e0e0f]/90 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-end mb-6">
          <div>
            <span className="text-[10px] text-[#00F5FF] font-black uppercase tracking-[0.4em]">Sticker Album</span>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">The 20 Legends</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/40 uppercase font-bold">Progress</p>
            <p className="text-xl font-black text-[#2FF801]">{collectedCount} / {strains.length}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-white/20" size={18} />
          <input 
            type="text" 
            placeholder="Sorte im Album suchen..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-[#00F5FF]/50 transition-all shadow-inner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {/* Album Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#00F5FF]" size={32} /></div>
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
                    {/* Visual Status Indicator */}
                    {!isCollected && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-grayscale">
                        <Lock className="text-white/20" size={24} />
                      </div>
                    )}

                    {/* Card Content */}
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
                        <span className="text-[8px] text-white/30 font-mono">#{strain.id.slice(0,4)}</span>
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
