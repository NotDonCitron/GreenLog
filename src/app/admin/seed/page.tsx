"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Database, CheckCircle2, Trash2 } from "lucide-react";

const STRAIN_DATA = [
  { name: "Godfather OG", slug: "godfather-og", type: "indica", thc_max: 34, image_url: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&w=600&q=80" },
  { name: "Animal Face", slug: "animal-face", type: "indica", thc_max: 30, image_url: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?auto=format&fit=crop&w=600&q=80" },
  { name: "GMO Cookies", slug: "gmo-cookies", type: "indica", thc_max: 33, image_url: "https://images.unsplash.com/photo-1599733589046-10c005739ef0?auto=format&fit=crop&w=600&q=80" },
  { name: "Gelato #33", slug: "gelato-33", type: "hybrid", thc_max: 25, image_url: "https://images.unsplash.com/photo-1603909793711-9fa29d23d51b?auto=format&fit=crop&w=600&q=80" },
  { name: "Sour Diesel", slug: "sour-diesel", type: "sativa", thc_max: 22, image_url: "https://images.unsplash.com/photo-1556928045-16f7f50be0f3?auto=format&fit=crop&w=600&q=80" },
  { name: "Durban Poison", slug: "durban-poison", type: "sativa", thc_max: 25, image_url: "https://images.unsplash.com/photo-1594498653385-d5172c532c00?auto=format&fit=crop&w=600&q=80" },
  { name: "White Widow", slug: "white-widow", type: "hybrid", thc_max: 25, image_url: "https://images.unsplash.com/photo-1612111000950-6899aa9ca6ce?auto=format&fit=crop&w=600&q=80" },
  { name: "OG Kush", slug: "og-kush", type: "hybrid", thc_max: 26, image_url: "https://images.unsplash.com/photo-1595273670150-db0c3c392416?auto=format&fit=crop&w=600&q=80" },
  { name: "Jack Herer", slug: "jack-herer", type: "sativa", thc_max: 24, image_url: "https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&w=600&q=80" },
  { name: "Purple Haze", slug: "purple-haze", type: "sativa", thc_max: 20, image_url: "https://images.unsplash.com/photo-1562619425-c307b2c592af?auto=format&fit=crop&w=600&q=80" },
  { name: "Amnesia Haze", slug: "amnesia-haze", type: "sativa", thc_max: 25, image_url: "https://images.unsplash.com/photo-1516733968668-dbd0399e05bc?auto=format&fit=crop&w=600&q=80" },
  { name: "Blueberry", slug: "blueberry", type: "indica", thc_max: 24, image_url: "https://images.unsplash.com/photo-1591261730799-ee4e6c2d16d7?auto=format&fit=crop&w=600&q=80" },
  { name: "Granddaddy Purple", slug: "gdp", type: "indica", thc_max: 23, image_url: "https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?auto=format&fit=crop&w=600&q=80" },
  { name: "Acapulco Gold", slug: "acapulco-gold", type: "sativa", thc_max: 24, image_url: "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=600&q=80" },
  { name: "Skywalker OG", slug: "skywalker-og", type: "indica", thc_max: 26, image_url: "https://images.unsplash.com/photo-1559103433-9099ba490907?auto=format&fit=crop&w=600&q=80" },
  { name: "Green Crack", slug: "green-crack", type: "sativa", thc_max: 25, image_url: "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&w=600&q=80" },
  { name: "Bruce Banner", slug: "bruce-banner", type: "hybrid", thc_max: 29, image_url: "https://images.unsplash.com/photo-1528190336454-13cd56b45b5a?auto=format&fit=crop&w=600&q=80" },
  { name: "Northern Lights", slug: "northern-lights", type: "indica", thc_max: 21, image_url: "https://images.unsplash.com/photo-1515150144380-bca9f1650ed9?auto=format&fit=crop&w=600&q=80" },
  { name: "Blue Dream", slug: "blue-dream-official", type: "sativa", thc_max: 24, image_url: "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?auto=format&fit=crop&w=600&q=80" },
  { name: "Pineapple Express", slug: "pineapple-express", type: "hybrid", thc_max: 22, image_url: "https://images.unsplash.com/photo-1505744386214-51dba16a26fc?auto=format&fit=crop&w=600&q=80" }
];

export default function AdminSeedPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleResetAndSeed = async () => {
    if (!user) return;
    setStatus("loading");
    setMessage("Hard-Reload der Bilder-Galerie...");

    try {
      // 1. Alle Strains löschen
      await supabase.from("strains").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      // 2. Neue Unikate mit festen URLs einfügen
      const { error } = await supabase.from("strains").insert(STRAIN_DATA);
      if (error) throw error;

      setStatus("success");
      setMessage("ALBUM GEFIXED! 20 verschiedene Top-Bilder geladen.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Fehler beim Reset.");
    }
  };

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white flex flex-col items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 bg-[#1a191b] border-white/10 text-center space-y-6 shadow-2xl">
        <Database className="text-[#00F5FF] mx-auto animate-bounce" size={64} />
        <h1 className="text-2xl font-black uppercase tracking-tighter italic text-white">Image <span className="text-[#00F5FF]">Repair Center</span></h1>
        <p className="text-white/40 text-[10px] uppercase tracking-widest leading-relaxed">
          Dies erzwingt 20 unterschiedliche, hochauflösende Bilder für dein Sticker-Album.
        </p>
        <Button onClick={handleResetAndSeed} disabled={status === "loading" || !user} className="w-full h-16 bg-[#00F5FF] text-black font-black hover:bg-[#00F5FF]/80 transition-all text-lg uppercase tracking-widest gap-2 shadow-[0_0_30px_rgba(0,245,255,0.3)]">
          {status === "loading" ? <Loader2 className="animate-spin" /> : "BILDER JETZT FIXEN"}
        </Button>
        {status === "success" && <div className="p-4 bg-[#2FF801]/10 border border-[#2FF801]/20 rounded-xl text-[#2FF801] text-xs font-bold animate-in zoom-in">{message}</div>}
      </Card>
    </main>
  );
}
