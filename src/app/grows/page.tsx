"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Sprout, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Grow {
  id: string;
  title: string;
  grow_type: string;
  status: string;
  start_date: string;
  strains?: {
    name: string;
  };
}

export default function GrowsPage() {
  const { user, isDemoMode, loading: authLoading } = useAuth();
  const [grows, setGrows] = useState<Grow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGrows() {
      if (!user && !isDemoMode) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (isDemoMode) {
          // Add some demo data for grows if in demo mode
          setGrows([
            {
              id: "demo-1",
              title: "Purple Haze Outdoor",
              grow_type: "outdoor",
              status: "active",
              start_date: "2024-03-01",
              strains: { name: "Purple Haze" }
            },
            {
              id: "demo-2",
              title: "Gorilla Glue #4 Indoor",
              grow_type: "indoor",
              status: "completed",
              start_date: "2024-01-15",
              harvest_date: "2024-03-20",
              strains: { name: "Gorilla Glue #4" }
            }
          ]);
        } else if (user) {
          const { data, error } = await supabase
            .from("grows")
            .select(`*, strains (name)`)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (data) setGrows(data);
          if (error) console.error("Error fetching grows:", error);
        }
      } catch (err) {
        console.error("Fetch grows error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchGrows();
    }
  }, [user, isDemoMode, authLoading]);

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white pb-32">
      <header className="p-8 sticky top-0 bg-[#0e0e0f]/90 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-end mb-6">
          <div>
            <span className="text-[10px] text-[#00F5FF] font-black uppercase tracking-[0.4em]">Grow Tracker</span>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Meine Grows</h1>
          </div>
          <Link href="/grows/new">
            <Button size="icon" className="bg-[#00F5FF] hover:bg-[#00D5E0] text-black rounded-full shadow-[0_0_15px_rgba(0,245,255,0.3)]">
              <Plus size={24} />
            </Button>
          </Link>
        </div>
      </header>

      <div className="p-6">
        {loading || authLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-[#00F5FF]" size={48} />
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Lade Grows...</p>
          </div>
        ) : grows.length > 0 ? (
          <div className="space-y-4">
            {grows.map((grow) => (
              <Card key={grow.id} className="bg-[#1a191b] border-white/5 overflow-hidden group active:scale-[0.98] transition-all">
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${grow.status === 'active' ? 'bg-[#2FF801]/10 text-[#2FF801]' : 'bg-white/5 text-white/40'}`}>
                        <Sprout size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-lg uppercase tracking-tight leading-none">{grow.title}</h3>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
                          {grow.strains?.name || 'Unbekannte Sorte'} • {grow.grow_type}
                        </p>
                      </div>
                    </div>
                    <Badge className={grow.status === 'active' ? 'bg-[#2FF801] text-black border-none font-bold' : 'bg-white/10 text-white/40 border-none font-bold'}>
                      {grow.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2 text-white/40">
                      <Calendar size={12} />
                      <span className="text-[10px] font-bold uppercase">{grow.start_date || 'Kein Startdatum'}</span>
                    </div>
                    <Link href={`/grows/${grow.id}`} className="text-[#00F5FF] text-[10px] font-black uppercase flex items-center gap-1 group-hover:gap-2 transition-all">
                      Details <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 space-y-6">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/10 shadow-2xl text-white/20">
              <Sprout size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight">Keine aktiven Grows</h2>
              <p className="text-white/40 text-sm mt-2 max-w-[200px] mx-auto">Starte jetzt deinen ersten Grow und tracke deinen Fortschritt!</p>
            </div>
            <Link href="/grows/new">
              <Button className="bg-[#00F5FF] hover:bg-[#00D5E0] text-black font-black uppercase tracking-widest text-xs px-8 py-6 rounded-2xl shadow-[0_0_20px_rgba(0,245,255,0.2)]">
                Jetzt Starten
              </Button>
            </Link>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
