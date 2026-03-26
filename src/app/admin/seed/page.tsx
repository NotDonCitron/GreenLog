"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Database, CheckCircle2, RefreshCw, ShieldCheck, ChevronLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Strain } from "@/lib/types";

// 20 AI-GENERIERTE, PHOTOREALISTISCHE CANNABIS BILDER (GARANTIERT KEINE KATZEN)
const STRAIN_DATA: Partial<Strain>[] = [
  { name: "Godfather OG", slug: "godfather-og", type: "indica", thc_max: 34, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20Godfather%20OG?width=600&height=800&seed=1" },
  { name: "Animal Face", slug: "animal-face", type: "indica", thc_max: 30, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20Animal%20Face?width=600&height=800&seed=2" },
  { name: "GMO Cookies", slug: "gmo-cookies", type: "indica", thc_max: 33, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20GMO%20Cookies?width=600&height=800&seed=3" },
  { name: "Gelato #33", slug: "gelato-33", type: "hybrid", thc_max: 25, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20Gelato%2033?width=600&height=800&seed=4" },
  { name: "Sour Diesel", slug: "sour-diesel", type: "sativa", thc_max: 22, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20Sour%20Diesel?width=600&height=800&seed=5" },
  { name: "Durban Poison", slug: "durban-poison", type: "sativa", thc_max: 25, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20Durban%20Poison?width=600&height=800&seed=6" },
  { name: "White Widow", slug: "white-widow", type: "hybrid", thc_max: 25, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20White%20Widow?width=600&height=800&seed=7" },
  { name: "OG Kush", slug: "og-kush", type: "hybrid", thc_max: 26, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20OG%20Kush?width=600&height=800&seed=8" },
  { name: "Jack Herer", slug: "jack-herer", type: "sativa", thc_max: 24, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20Jack%20Herer?width=600&height=800&seed=9" },
  { name: "Purple Haze", slug: "purple-haze", type: "sativa", thc_max: 20, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20Purple%20Haze?width=600&height=800&seed=10" },
  { name: "Amnesia Haze", slug: "amnesia-haze", type: "sativa", thc_max: 25, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20Amnesia%20Haze?width=600&height=800&seed=11" },
  { name: "Blueberry", slug: "blueberry", type: "indica", thc_max: 24, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20Blueberry?width=600&height=800&seed=12" },
  { name: "Granddaddy Purple", slug: "gdp", type: "indica", thc_max: 23, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20Granddaddy%20Purple?width=600&height=800&seed=13" },
  { name: "Acapulco Gold", slug: "acapulco-gold", type: "sativa", thc_max: 24, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20Acapulco%20Gold?width=600&height=800&seed=14" },
  { name: "Skywalker OG", slug: "skywalker-og", type: "indica", thc_max: 26, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20Skywalker%20OG?width=600&height=800&seed=15" },
  { name: "Green Crack", slug: "green-crack", type: "sativa", thc_max: 25, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20Green%20Crack?width=600&height=800&seed=16" },
  { name: "Bruce Banner", slug: "bruce-banner", type: "hybrid", thc_max: 29, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20Bruce%20Banner?width=600&height=800&seed=17" },
  { name: "Northern Lights", slug: "northern-lights", type: "indica", thc_max: 21, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20Northern%20Lights?width=600&height=800&seed=18" },
  { name: "Blue Dream", slug: "blue-dream-official", type: "sativa", thc_max: 24, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20Blue%20Dream?width=600&height=800&seed=19" },
  { name: "Pineapple Express", slug: "pineapple-express", type: "hybrid", thc_max: 22, image_url: "https://pollinations.ai/p/photorealistic%20cannabis%20bud%20macro%20close-up%20Pineapple%20Express?width=600&height=800&seed=20" }
];

export default function AdminSeedPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleUpsertSeed = async () => {
    if (!user) return;
    setStatus("loading");
    setMessage("AI-Image Synthesis in progress...");

    try {
      const { error } = await supabase
        .from("strains")
        .upsert(STRAIN_DATA, { onConflict: 'slug' });

      if (error) throw error;

      setStatus("success");
      setMessage("AI-SYNC COMPLETE!");
    } catch (err) {
      const error = err as Error;
      console.error(error);
      setStatus("error");
      setMessage(error.message || "Error during sync.");
    }
  };

  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-6 relative">
      <Link href="/profile" className="absolute top-8 left-8 p-3 rounded-full bg-black/5 border border-black/10 hover:bg-black/10 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
        <ChevronLeft size={14} /> Back
      </Link>

      <Card className="max-w-md w-full p-10 bg-[#1a191b] border-black/10 text-center space-y-8 shadow-2xl border-t-4 border-t-[#2FF801]">
        <Database className="text-[#2FF801] mx-auto animate-pulse" size={64} />

        <div className="space-y-2">
          <h1 className="text-xl font-black uppercase tracking-tighter italic">AI <span className="text-[#2FF801]">Visual Sync</span></h1>
          <p className="text-black/30 text-[10px] uppercase tracking-widest leading-relaxed">
            Generates high-fidelity photorealistic bud images for all legendary strains.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleUpsertSeed}
            disabled={status === "loading" || !user}
            className="w-full h-16 bg-[#2FF801] text-black font-black hover:bg-[#2FF801]/80 transition-all text-sm uppercase tracking-widest gap-2"
          >
            {status === "loading" ? <Loader2 className="animate-spin" /> : <><RefreshCw size={20} /> INITIALIZE AI SYNC</>}
          </Button>

          {status === "success" && (
            <div className="p-5 bg-[#2FF801]/10 border border-[#2FF801]/20 rounded-xl text-[#2FF801] text-xs font-bold flex flex-col items-center gap-3 animate-in zoom-in">
              <ShieldCheck size={32} />
              <p className="uppercase tracking-widest">{message}</p>
              <Link href="/strains" className="mt-2 text-black bg-[#2FF801] px-6 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform">View Album</Link>
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
