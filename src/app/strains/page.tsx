"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Grid2X2, List, Loader2, Leaf } from "lucide-react";
import Link from "next/link";

export default function StrainsPage() {
  const [strains, setStrains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchStrains() {
      const { data } = await supabase.from("strains").select("*").order("name");
      if (data) setStrains(data);
      setLoading(false);
    }
    fetchStrains();
  }, []);

  const filteredStrains = strains.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white pb-32">
      {/* Header */}
      <header className="p-6 sticky top-0 bg-[#0e0e0f]/80 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-black italic tracking-tighter uppercase">Strain Album</h1>
          <div className="flex gap-2">
            <button className="p-2 bg-white/5 rounded-lg text-[#00F5FF]"><Grid2X2 size={20} /></button>
            <button className="p-2 text-white/20"><List size={20} /></button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 text-white/20" size={18} />
          <input 
            type="text" 
            placeholder="Sorte suchen..."
            className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-[#00F5FF]/50 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
          </div>
        ) : filteredStrains.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredStrains.map((strain) => (
              <Link key={strain.id} href={`/strains/${strain.slug}`}>
                <Card className="bg-[#1a191b] border-white/5 overflow-hidden group hover:border-[#00F5FF]/30 transition-all active:scale-95">
                  <div className="aspect-square relative">
                    <img src={strain.image_url} alt={strain.name} className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a191b] via-transparent to-transparent" />
                    <Badge className="absolute top-2 right-2 bg-black/60 text-[8px] uppercase border-none">{strain.type}</Badge>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-xs uppercase tracking-tight truncate">{strain.name}</h3>
                    <p className="text-[10px] text-white/40 font-mono mt-1">{strain.thc_max}% THC</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <Leaf className="text-white/10" size={32} />
            </div>
            <p className="text-white/40 text-sm">Keine Strains gefunden.</p>
            <Link href="/admin/seed" className="text-[#00F5FF] text-xs uppercase font-bold tracking-widest hover:underline">
              Datenbank Seeden →
            </Link>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
