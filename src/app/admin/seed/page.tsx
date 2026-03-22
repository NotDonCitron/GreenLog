"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Database, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";

// 20 Echte, funktionierende Unsplash IDs für Cannabis/Buds
const STRAIN_DATA = [
  { name: "Godfather OG", slug: "godfather-og", type: "indica", thc_max: 34, image_url: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=800" },
  { name: "Animal Face", slug: "animal-face", type: "indica", thc_max: 30, image_url: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?auto=format&fit=crop&q=80&w=800" },
  { name: "GMO Cookies", slug: "gmo-cookies", type: "indica", thc_max: 33, image_url: "https://images.unsplash.com/photo-1599733589046-10c005739ef0?auto=format&fit=crop&q=80&w=800" },
  { name: "Gelato #33", slug: "gelato-33", type: "hybrid", thc_max: 25, image_url: "https://images.unsplash.com/photo-1603909793711-9fa29d23d51b?auto=format&fit=crop&q=80&w=800" },
  { name: "Sour Diesel", slug: "sour-diesel", type: "sativa", thc_max: 22, image_url: "https://images.unsplash.com/photo-1556928045-16f7f50be0f3?auto=format&fit=crop&q=80&w=800" },
  { name: "Durban Poison", slug: "durban-poison", type: "sativa", thc_max: 25, image_url: "https://images.unsplash.com/photo-1594498653385-d5172c532c00?auto=format&fit=crop&q=80&w=800" },
  { name: "White Widow", slug: "white-widow", type: "hybrid", thc_max: 25, image_url: "https://images.unsplash.com/photo-1612111000950-6899aa9ca6ce?auto=format&fit=crop&q=80&w=800" },
  { name: "OG Kush", slug: "og-kush", type: "hybrid", thc_max: 26, image_url: "https://images.unsplash.com/photo-1595273670150-db0c3c392416?auto=format&fit=crop&q=80&w=800" },
  { name: "Jack Herer", slug: "jack-herer", type: "sativa", thc_max: 24, image_url: "https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&q=80&w=800" },
  { name: "Purple Haze", slug: "purple-haze", type: "sativa", thc_max: 20, image_url: "https://images.unsplash.com/photo-1562619425-c307b2c592af?auto=format&fit=crop&q=80&w=800" },
  { name: "Amnesia Haze", slug: "amnesia-haze", type: "sativa", thc_max: 25, image_url: "https://images.unsplash.com/photo-1516733968668-dbd0399e05bc?auto=format&fit=crop&q=80&w=800" },
  { name: "Blueberry", slug: "blueberry", type: "indica", thc_max: 24, image_url: "https://images.unsplash.com/photo-1591261730799-ee4e6c2d16d7?auto=format&fit=crop&q=80&w=800" },
  { name: "Granddaddy Purple", slug: "gdp", type: "indica", thc_max: 23, image_url: "https://images.unsplash.com/photo-1516733968668-dbd0399e05bc?auto=format&fit=crop&q=80&w=800" },
  { name: "Acapulco Gold", slug: "acapulco-gold", type: "sativa", thc_max: 24, image_url: "https://images.unsplash.com/photo-1594498653385-d5172c532c00?auto=format&fit=crop&q=80&w=800" },
  { name: "Skywalker OG", slug: "skywalker-og", type: "indica", thc_max: 26, image_url: "https://images.unsplash.com/photo-1595273670150-db0c3c392416?auto=format&fit=crop&q=80&w=800" },
  { name: "Green Crack", slug: "green-crack", type: "sativa", thc_max: 25, image_url: "https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&q=80&w=800" },
  { name: "Bruce Banner", slug: "bruce-banner", type: "hybrid", thc_max: 29, image_url: "https://images.unsplash.com/photo-1603909793711-9fa29d23d51b?auto=format&fit=crop&q=80&w=800" },
  { name: "Northern Lights", slug: "northern-lights", type: "indica", thc_max: 21, image_url: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=800" },
  { name: "Blue Dream", slug: "blue-dream-official", type: "sativa", thc_max: 24, image_url: "https://images.unsplash.com/photo-1599733589046-10c005739ef0?auto=format&fit=crop&q=80&w=800" },
  { name: "Pineapple Express", slug: "pineapple-express", type: "hybrid", thc_max: 22, image_url: "https://images.unsplash.com/photo-1516733968668-dbd0399e05bc?auto=format&fit=crop&q=80&w=800" }
];

export default function AdminSeedPage() {
  const { user, isDemoMode } = useAuth();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleResetAndSeed = async () => {
    if (!user) return;
    setStatus("loading");
    setMessage("Lösche alte Daten und lade neue Legenden...");

    try {
      // 1. Alle Strains löschen (Reset)
      const { error: delError } = await supabase.from("strains").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (delError) throw delError;

      // 2. Neue Strains einfügen
      const { error: insError } = await supabase.from("strains").insert(STRAIN_DATA);
      if (insError) throw insError;

      setStatus("success");
      setMessage("Datenbank erfolgreich bereinigt und 20 Legenden geladen!");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Fehler beim Reset.");
    }
  };

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white flex flex-col items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 bg-[#1a191b] border-white/10 text-center space-y-6 shadow-2xl">
        <Database className="text-[#00F5FF] mx-auto animate-pulse" size={64} />
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">Database <span className="text-[#00F5FF]">Master Reset</span></h1>
        <p className="text-white/40 text-xs uppercase tracking-widest leading-relaxed">
          Dies löscht alle vorhandenen Strains und lädt 20 neue Legenden mit High-Res Bildern und korrekten Daten.
        </p>

        <div className="pt-4 space-y-4">
          <Button 
            onClick={handleResetAndSeed} 
            disabled={status === "loading" || !user}
            className="w-full h-16 bg-red-500 text-white font-black hover:bg-red-600 transition-all text-lg uppercase tracking-widest gap-2 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
          >
            {status === "loading" ? <Loader2 className="animate-spin" /> : <><Trash2 size={24} /> Reset & Reload</>}
          </Button>
          
          {!user && (
            <div className="flex items-center gap-2 text-red-500 text-[10px] uppercase font-bold justify-center">
              <AlertTriangle size={14} /> Login erforderlich
            </div>
          )}
        </div>

        {status === "success" && (
          <div className="p-4 bg-[#2FF801]/10 border border-[#2FF801]/20 rounded-xl text-[#2FF801] text-xs font-bold flex items-center gap-2 animate-in zoom-in">
            <CheckCircle2 size={20} /> {message}
          </div>
        )}
      </Card>
    </main>
  );
}
