"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Database, CheckCircle2, AlertCircle } from "lucide-react";

const STRAIN_DATA = [
  {
    name: "Godfather OG",
    slug: "godfather-og",
    type: "indica",
    thc_min: 30,
    thc_max: 34,
    description: "The strongest Indica on the market. Deeply sedating and euphoric.",
    effects: ["Sleep", "Relaxation", "Pain Relief"],
    terpenes: ["Myrcene", "Caryophyllene", "Limonene"],
    image_url: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Animal Face",
    slug: "animal-face",
    type: "indica",
    thc_min: 26,
    thc_max: 30,
    description: "Heavy-hitting mind-numbing high that melts into full-body relaxation.",
    effects: ["Relaxation", "Euphoria"],
    terpenes: ["Myrcene", "Caryophyllene"],
    image_url: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "GMO Cookies",
    slug: "gmo-cookies",
    type: "indica",
    thc_min: 27,
    thc_max: 33,
    description: "Intense euphoria followed by a heavy couch-lock sedation.",
    effects: ["Euphoria", "Sleep"],
    terpenes: ["Caryophyllene", "Myrcene", "Limonene"],
    image_url: "https://images.unsplash.com/photo-1599733589046-10c005739ef0?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Gelato #33",
    slug: "gelato-33",
    type: "hybrid",
    thc_min: 20,
    thc_max: 25,
    description: "Uplifting and energetic at first, settling into a relaxed body high.",
    effects: ["Happiness", "Relaxation"],
    terpenes: ["Caryophyllene", "Limonene"],
    image_url: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Sour Diesel",
    slug: "sour-diesel",
    type: "sativa",
    thc_min: 18,
    thc_max: 22,
    description: "Fast-acting, dreamy cerebral high. Excellent for daytime productivity.",
    effects: ["Energy", "Focus", "Stress Relief"],
    terpenes: ["Myrcene", "Limonene"],
    image_url: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Durban Poison",
    slug: "durban-poison",
    type: "sativa",
    thc_min: 15,
    thc_max: 25,
    description: "The espresso of cannabis. Highly energetic and clear-headed.",
    effects: ["Energy", "Focus", "Creativity"],
    terpenes: ["Terpinolene", "Myrcene"],
    image_url: "https://images.unsplash.com/photo-1599733589046-10c005739ef0?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Girl Scout Cookies",
    slug: "gsc",
    type: "hybrid",
    thc_min: 25,
    thc_max: 28,
    description: "Famous for its sweet and earthy flavor. Full-body relaxation.",
    effects: ["Relaxation", "Euphoria"],
    terpenes: ["Caryophyllene", "Myrcene", "Limonene"],
    image_url: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Mimosa",
    slug: "mimosa",
    type: "hybrid",
    thc_min: 19,
    thc_max: 27,
    description: "Happy, level-headed, and motivated. Perfect for social gatherings.",
    effects: ["Happiness", "Motivation"],
    terpenes: ["Limonene", "Myrcene", "Pinene"],
    image_url: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Zkittlez",
    slug: "zkittlez",
    type: "hybrid",
    thc_min: 15,
    thc_max: 23,
    description: "Surprisingly mellow for a hybrid. Provides a calm and focused experience.",
    effects: ["Focus", "Calm"],
    terpenes: ["Caryophyllene", "Humulene"],
    image_url: "https://images.unsplash.com/photo-1599733589046-10c005739ef0?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Blue Dream",
    slug: "blue-dream-live",
    type: "sativa",
    thc_min: 17,
    thc_max: 20,
    description: "Perfect daytime strain for motivation and energy.",
    effects: ["Motivation", "Energy"],
    terpenes: ["Myrcene", "Pinene"],
    image_url: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=800"
  }
];

export default function AdminSeedPage() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSeed = async () => {
    if (!user) return;
    setStatus("loading");
    setMessage("Starte Datenbank-Upload...");

    try {
      // Vorhandene Strains prüfen, um Duplikate zu vermeiden
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
      setMessage(`${toInsert.length} neue Strains erfolgreich hinzugefügt!`);
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err.message || "Fehler beim Seeden der Datenbank.");
    }
  };

  if (authLoading) return null;

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white flex flex-col items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 bg-[#1a191b] border-white/10 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-[#00F5FF]/10 rounded-full flex items-center justify-center">
            <Database className="text-[#00F5FF]" size={32} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold uppercase tracking-widest text-[#00F5FF]">Database Seeder</h1>
        <p className="text-white/40 text-sm">
          Dies füllt deine Supabase-Tabelle `strains` mit 10 hochwertigen Premium-Strains aus der Recherche.
        </p>

        {!user ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-500 text-sm">
            <AlertCircle size={20} />
            Bitte logge dich zuerst ein, um Daten zu schreiben.
          </div>
        ) : (
          <Button 
            onClick={handleSeed} 
            disabled={status === "loading"}
            className="w-full h-14 bg-[#00F5FF] text-black font-black hover:bg-[#00F5FF]/80 transition-all text-lg"
          >
            {status === "loading" ? <Loader2 className="animate-spin" /> : "DATEN JETZT LADEN"}
          </Button>
        )}

        {status === "success" && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3 text-green-500 text-sm">
            <CheckCircle2 size={20} />
            {message}
          </div>
        ) }

        {status === "error" && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-500 text-sm font-mono">
            {message}
          </div>
        )}
      </Card>
    </main>
  );
}
