"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Database, CheckCircle2, AlertCircle } from "lucide-react";

const STRAIN_DATA = [
  { name: "Godfather OG", slug: "godfather-og", type: "indica", thc_min: 30, thc_max: 34, description: "Strongest Indica. Deeply sedating.", effects: ["Sleep", "Relaxation"], terpenes: ["Myrcene"], image_url: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?auto=format&fit=crop&q=80&w=800" },
  { name: "Animal Face", slug: "animal-face", type: "indica", thc_min: 26, thc_max: 30, description: "Heavy-hitting mind-numbing high.", effects: ["Relaxation"], terpenes: ["Caryophyllene"], image_url: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=800" },
  { name: "GMO Cookies", slug: "gmo-cookies", type: "indica", thc_min: 27, thc_max: 33, description: "Intense euphoria and sedation.", effects: ["Euphoria"], terpenes: ["Myrcene"], image_url: "https://images.unsplash.com/photo-1599733589046-10c005739ef0?auto=format&fit=crop&q=80&w=800" },
  { name: "Gelato #33", slug: "gelato-33", type: "hybrid", thc_min: 20, thc_max: 25, description: "Relaxed body high, sweet taste.", effects: ["Happiness"], terpenes: ["Limonene"], image_url: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=800" },
  { name: "Sour Diesel", slug: "sour-diesel", type: "sativa", thc_min: 18, thc_max: 22, description: "Cerebral high, great for stress.", effects: ["Energy"], terpenes: ["Limonene"], image_url: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?auto=format&fit=crop&q=80&w=800" },
  { name: "Durban Poison", slug: "durban-poison", type: "sativa", thc_min: 15, thc_max: 25, description: "Pure Sativa, highly energetic.", effects: ["Focus"], terpenes: ["Terpinolene"], image_url: "https://images.unsplash.com/photo-1599733589046-10c005739ef0?auto=format&fit=crop&q=80&w=800" },
  { name: "White Widow", slug: "white-widow", type: "hybrid", thc_min: 18, thc_max: 25, description: "Legendary resin-heavy hybrid.", effects: ["Creativity", "Relaxation"], terpenes: ["Myrcene", "Pinene"], image_url: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=800" },
  { name: "OG Kush", slug: "og-kush", type: "hybrid", thc_min: 20, thc_max: 26, description: "The backbone of West Coast strains.", effects: ["Euphoria", "Sleep"], terpenes: ["Myrcene", "Limonene"], image_url: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?auto=format&fit=crop&q=80&w=800" },
  { name: "Jack Herer", slug: "jack-herer", type: "sativa", thc_min: 17, thc_max: 24, description: "Clear-headed and creative high.", effects: ["Focus", "Happiness"], terpenes: ["Terpinolene", "Caryophyllene"], image_url: "https://images.unsplash.com/photo-1599733589046-10c005739ef0?auto=format&fit=crop&q=80&w=800" },
  { name: "Purple Haze", slug: "purple-haze", type: "sativa", thc_min: 16, thc_max: 20, description: "High-energy cerebral stimulation.", effects: ["Euphoria", "Energy"], terpenes: ["Myrcene", "Pinene"], image_url: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=800" },
  { name: "Amnesia Haze", slug: "amnesia-haze", type: "sativa", thc_min: 20, thc_max: 25, description: "Classic earthy, lemony sativa.", effects: ["Focus", "Euphoria"], terpenes: ["Myrcene", "Limonene"], image_url: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?auto=format&fit=crop&q=80&w=800" },
  { name: "Blueberry", slug: "blueberry", type: "indica", thc_min: 16, thc_max: 24, description: "Sweet berry flavor and long-lasting effects.", effects: ["Sleep", "Relaxation"], terpenes: ["Myrcene", "Caryophyllene"], image_url: "https://images.unsplash.com/photo-1599733589046-10c005739ef0?auto=format&fit=crop&q=80&w=800" },
  { name: "Granddaddy Purple", slug: "gdp", type: "indica", thc_min: 17, thc_max: 23, description: "Famous purple strain, deeply relaxing.", effects: ["Sleep", "Appetit"], terpenes: ["Myrcene", "Linalool"], image_url: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=800" },
  { name: "Acapulco Gold", slug: "acapulco-gold", type: "sativa", thc_min: 19, thc_max: 24, description: "Rare and legendary Mexican sativa.", effects: ["Energy", "Happiness"], terpenes: ["Myrcene", "Limonene"], image_url: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?auto=format&fit=crop&q=80&w=800" },
  { name: "Girl Scout Cookies", slug: "gsc-new", type: "hybrid", thc_min: 25, thc_max: 28, description: "Euphoric high with full-body relaxation.", effects: ["Relaxation", "Happiness"], terpenes: ["Caryophyllene", "Limonene"], image_url: "https://images.unsplash.com/photo-1599733589046-10c005739ef0?auto=format&fit=crop&q=80&w=800" },
  { name: "Northern Lights", slug: "northern-lights", type: "indica", thc_min: 16, thc_max: 21, description: "Pure indica, sweet and spicy aroma.", effects: ["Sleep", "Relaxation"], terpenes: ["Myrcene", "Pinene"], image_url: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=800" },
  { name: "Bruce Banner", slug: "bruce-banner", type: "hybrid", thc_min: 24, thc_max: 29, description: "Powerful and creative hybrid.", effects: ["Energy", "Euphoria"], terpenes: ["Myrcene", "Caryophyllene"], image_url: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?auto=format&fit=crop&q=80&w=800" },
  { name: "Blue Dream", slug: "blue-dream-pro", type: "sativa", thc_min: 17, thc_max: 24, description: "The ultimate daytime hybrid.", effects: ["Happiness", "Focus"], terpenes: ["Myrcene", "Pinene"], image_url: "https://images.unsplash.com/photo-1599733589046-10c005739ef0?auto=format&fit=crop&q=80&w=800" },
  { name: "Skywalker OG", slug: "skywalker-og", type: "indica", thc_min: 20, thc_max: 26, description: "Heavy indica with spicy herbal aroma.", effects: ["Sleep", "Euphoria"], terpenes: ["Myrcene", "Limonene"], image_url: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=800" },
  { name: "Green Crack", slug: "green-crack", type: "sativa", thc_min: 15, thc_max: 25, description: "Sharp focus and an invigorating mental buzz.", effects: ["Energy", "Focus"], terpenes: ["Myrcene", "Pinene"], image_url: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?auto=format&fit=crop&q=80&w=800" }
];

export default function AdminSeedPage() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSeed = async () => {
    if (!user) return;
    setStatus("loading");
    setMessage("Starte Datenbank-Upload (20 Legends)...");

    try {
      const { data: existing } = await supabase.from("strains").select("slug");
      const existingSlugs = existing?.map(s => s.slug) || [];
      const toInsert = STRAIN_DATA.filter(s => !existingSlugs.includes(s.slug));

      if (toInsert.length === 0) {
        setStatus("success");
        setMessage("Datenbank ist bereits auf dem neuesten Stand!");
        return;
      }

      const { error } = await supabase.from("strains").insert(toInsert);
      if (error) throw error;

      setStatus("success");
      setMessage(`${toInsert.length} neue Legenden erfolgreich hinzugefügt!`);
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err.message || "Fehler beim Seeden.");
    }
  };

  if (authLoading) return null;

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white flex flex-col items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 bg-[#1a191b] border-white/10 text-center space-y-6">
        <Database className="text-[#00F5FF] mx-auto" size={48} />
        <h1 className="text-2xl font-bold uppercase tracking-widest text-[#00F5FF]">Legends Seeder v2</h1>
        <p className="text-white/40 text-sm">Dies lädt die 20 berühmtesten Strains der Welt in deine App.</p>
        <Button onClick={handleSeed} disabled={status === "loading"} className="w-full h-14 bg-[#00F5FF] text-black font-black hover:bg-[#00F5FF]/80 transition-all text-lg uppercase tracking-widest">
          {status === "loading" ? <Loader2 className="animate-spin" /> : "Jetzt Strains laden"}
        </Button>
        {status === "success" && <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm flex items-center gap-2"><CheckCircle2 size={20} /> {message}</div>}
        {status === "error" && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">{message}</div>}
      </Card>
    </main>
  );
}
