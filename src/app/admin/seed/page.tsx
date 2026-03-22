"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Database, CheckCircle2, Trash2, ShieldAlert, ChevronLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

const STRAIN_DATA = [
  { name: "Godfather OG", slug: "godfather-og", type: "indica", thc_max: 34, image_url: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&w=600&q=80&v=1" },
  { name: "Animal Face", slug: "animal-face", type: "indica", thc_max: 30, image_url: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?auto=format&fit=crop&w=600&q=80&v=2" },
  { name: "GMO Cookies", slug: "gmo-cookies", type: "indica", thc_max: 33, image_url: "https://images.unsplash.com/photo-1599733589046-10c005739ef0?auto=format&fit=crop&w=600&q=80&v=3" },
  { name: "Gelato #33", slug: "gelato-33", type: "hybrid", thc_max: 25, image_url: "https://images.unsplash.com/photo-1603909793711-9fa29d23d51b?auto=format&fit=crop&w=600&q=80&v=4" },
  { name: "Sour Diesel", slug: "sour-diesel", type: "sativa", thc_max: 22, image_url: "https://images.unsplash.com/photo-1556928045-16f7f50be0f3?auto=format&fit=crop&w=600&q=80&v=5" },
  { name: "Durban Poison", slug: "durban-poison", type: "sativa", thc_max: 25, image_url: "https://images.unsplash.com/photo-1594498653385-d5172c532c00?auto=format&fit=crop&w=600&q=80&v=6" },
  { name: "White Widow", slug: "white-widow", type: "hybrid", thc_max: 25, image_url: "https://images.unsplash.com/photo-1612111000950-6899aa9ca6ce?auto=format&fit=crop&w=600&q=80&v=7" },
  { name: "OG Kush", slug: "og-kush", type: "hybrid", thc_max: 26, image_url: "https://images.unsplash.com/photo-1595273670150-db0c3c392416?auto=format&fit=crop&w=600&q=80&v=8" },
  { name: "Jack Herer", slug: "jack-herer", type: "sativa", thc_max: 24, image_url: "https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&w=600&q=80&v=9" },
  { name: "Purple Haze", slug: "purple-haze", type: "sativa", thc_max: 20, image_url: "https://images.unsplash.com/photo-1562619425-c307b2c592af?auto=format&fit=crop&w=600&q=80&v=10" },
  { name: "Amnesia Haze", slug: "amnesia-haze", type: "sativa", thc_max: 25, image_url: "https://images.unsplash.com/photo-1516733968668-dbd0399e05bc?auto=format&fit=crop&w=600&q=80&v=11" },
  { name: "Blueberry", slug: "blueberry", type: "indica", thc_max: 24, image_url: "https://images.unsplash.com/photo-1591261730799-ee4e6c2d16d7?auto=format&fit=crop&w=600&q=80&v=12" },
  { name: "Granddaddy Purple", slug: "gdp", type: "indica", thc_max: 23, image_url: "https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?auto=format&fit=crop&w=600&q=80&v=13" },
  { name: "Acapulco Gold", slug: "acapulco-gold", type: "sativa", thc_max: 24, image_url: "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=600&q=80&v=14" },
  { name: "Skywalker OG", slug: "skywalker-og", type: "indica", thc_max: 26, image_url: "https://images.unsplash.com/photo-1559103433-9099ba490907?auto=format&fit=crop&w=600&q=80&v=15" },
  { name: "Green Crack", slug: "green-crack", type: "sativa", thc_max: 25, image_url: "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&w=600&q=80&v=16" },
  { name: "Bruce Banner", slug: "bruce-banner", type: "hybrid", thc_max: 29, image_url: "https://images.unsplash.com/photo-1528190336454-13cd56b45b5a?auto=format&fit=crop&w=600&q=80&v=17" },
  { name: "Northern Lights", slug: "northern-lights", type: "indica", thc_max: 21, image_url: "https://images.unsplash.com/photo-1515150144380-bca9f1650ed9?auto=format&fit=crop&w=600&q=80&v=18" },
  { name: "Blue Dream", slug: "blue-dream-official", type: "sativa", thc_max: 24, image_url: "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?auto=format&fit=crop&w=600&q=80&v=19" },
  { name: "Pineapple Express", slug: "pineapple-express", type: "hybrid", thc_max: 22, image_url: "https://images.unsplash.com/photo-1505744386214-51dba16a26fc?auto=format&fit=crop&w=600&q=80&v=20" }
];

export default function AdminSeedPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleResetAndSeed = async () => {
    if (!user) return;
    setStatus("loading");
    setMessage("Starte Datenbank-Reinigung...");

    try {
      // 1. Echte Lösch-Anfrage (filtert nach allem was existiert)
      const { error: deleteError } = await supabase
        .from("strains")
        .delete()
        .gte("thc_max", 0); // Löscht alle Strains mit THC >= 0 (also alle)

      if (deleteError) throw deleteError;

      setMessage("Datenbank leer. Lade neue Legenden...");

      // 2. Neu einfügen
      const { error: insertError } = await supabase
        .from("strains")
        .insert(STRAIN_DATA);

      if (insertError) throw insertError;

      setStatus("success");
      setMessage("ERFOLG! Alle Bilder wurden erneuert.");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err.message || "Fehler beim Reset.");
    }
  };

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white flex flex-col items-center justify-center p-6 relative font-mono">
      <Link href="/profile" className="absolute top-8 left-8 p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]">
        <ChevronLeft size={14} /> Back to Terminal
      </Link>

      <Card className="max-w-md w-full p-10 bg-[#1a191b] border-white/10 text-center space-y-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00F5FF] to-transparent opacity-50" />
        
        <Database className="text-[#00F5FF] mx-auto animate-pulse" size={64} />
        
        <div className="space-y-2">
          <h1 className="text-xl font-black uppercase tracking-[0.3em] italic text-white">System <span className="text-[#00F5FF]">Overhaul</span></h1>
          <p className="text-white/30 text-[9px] uppercase tracking-widest leading-relaxed">
            Database cleanup protocol initiated. Forces unique image IDs.
          </p>
        </div>
        
        <div className="space-y-4">
          <Button 
            onClick={handleResetAndSeed} 
            disabled={status === "loading" || !user} 
            className="w-full h-16 bg-red-600 text-white font-black hover:bg-red-700 transition-all text-sm uppercase tracking-widest gap-2 shadow-[0_0_40px_rgba(220,38,38,0.2)]"
          >
            {status === "loading" ? <Loader2 className="animate-spin" /> : "EXECUTE MASTER RESET"}
          </Button>

          {status === "success" && (
            <div className="p-5 bg-[#2FF801]/10 border border-[#2FF801]/20 rounded-xl text-[#2FF801] text-xs font-bold flex flex-col items-center gap-3 animate-in zoom-in">
              <CheckCircle2 size={32} />
              <p className="uppercase tracking-widest">{message}</p>
              <Link href="/strains" className="mt-2 text-black bg-[#2FF801] px-6 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform">Album öffnen</Link>
            </div>
          )}

          {status === "error" && (
            <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-bold flex items-center gap-2 uppercase tracking-widest">
              <AlertCircle size={16} /> {message}
            </div>
          )}
        </div>
      </Card>
    </main>
  );
}
