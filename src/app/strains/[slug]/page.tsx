"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Info, RefreshCw, Star, Loader2, Heart, Share2, CheckCircle2 } from "lucide-react";

export default function StrainDetailPage() {
  const { slug } = useParams();
  const { user, isDemoMode } = useAuth();
  const router = useRouter();
  const [strain, setStrain] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasCollected, setHasCollected] = useState(false);

  useEffect(() => {
    async function fetchStrain() {
      // Demo Modus Simulation
      if (isDemoMode) {
        setStrain({
          id: "sim-1",
          name: "Godfather OG",
          type: "indica",
          thc_max: 34,
          description: "Simulated Data for Testing",
          terpenes: ["Myrcene"],
          effects: ["Sleep"],
          image_url: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?auto=format&fit=crop&q=80&w=800"
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("strains")
        .select("*")
        .eq("slug", slug)
        .single();
      
      if (data) {
        setStrain(data);
        if (user) {
          const { data: rating } = await supabase
            .from("ratings")
            .select("id")
            .eq("strain_id", data.id)
            .eq("user_id", user.id)
            .single();
          if (rating) setHasCollected(true);
        }
      }
      setLoading(false);
    }
    fetchStrain();
  }, [slug, user, isDemoMode]);

  const addToLogbook = async () => {
    if (isDemoMode) {
      setIsSaving(true);
      setTimeout(() => {
        setHasCollected(true);
        setIsSaving(false);
      }, 800);
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    setIsSaving(true);

    try {
      // 1. Sicherstellen, dass Profil existiert (Wichtig für Foreign Key)
      const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).single();
      
      if (!profile) {
        await supabase.from("profiles").insert({
          id: user.id,
          username: user.email?.split("@")[0] || "user_" + Math.random().toString(36).slice(2, 7),
          display_name: user.email?.split("@")[0]
        });
      }

      // 2. In Logbuch (ratings) eintragen
      const { error } = await supabase
        .from("ratings")
        .upsert({
          strain_id: strain.id,
          user_id: user.id,
          overall_rating: 5,
        });

      if (error) throw error;
      setHasCollected(true);
    } catch (err) {
      console.error(err);
      alert("Fehler beim Speichern. Bitte stelle sicher, dass du eingeloggt bist.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0e0e0f] flex items-center justify-center"><Loader2 className="animate-spin text-[#00F5FF]" size={40} /></div>;
  if (!strain) return <div className="text-white text-center py-20 uppercase tracking-widest font-bold">Strain not found</div>;

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white pb-32">
      <div className="p-6 flex justify-between items-center sticky top-0 z-50 bg-[#0e0e0f]/80 backdrop-blur-xl">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-white/5"><ChevronLeft size={24} /></button>
        <div className="flex gap-2">
          <button className="p-2 rounded-full bg-white/5 text-red-500"><Heart size={20} /></button>
          <button className="p-2 rounded-full bg-white/5 text-[#00F5FF]"><Share2 size={20} /></button>
        </div>
      </div>

      <div className="px-6 flex flex-col items-center">
        <div className="relative w-full max-w-[340px] aspect-[3/4.5] perspective-1000 mt-4 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            <Card className="absolute inset-0 backface-hidden overflow-hidden border-2 rounded-[2.5rem] bg-[#1a191b] border-[#00F5FF] ring-8 ring-[#00F5FF]/10 shadow-[0_0_50px_rgba(0,245,255,0.15)]">
              <div className="absolute inset-0 card-holo opacity-50 pointer-events-none" />
              <div className="h-3/5 relative">
                <img src={strain.image_url} alt={strain.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a191b] via-transparent to-transparent" />
                <div className="absolute top-6 right-6 bg-black/80 backdrop-blur-xl border border-[#00F5FF]/50 rounded-2xl p-3 flex flex-col items-center shadow-2xl">
                  <span className="text-[8px] text-[#00F5FF] font-black uppercase tracking-widest mb-1">THC Max</span>
                  <span className="text-xl font-black italic">{strain.thc_max}%</span>
                </div>
              </div>
              <div className="p-8 flex flex-col h-2/5 justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2"><Badge className="bg-[#2FF801]/10 text-[#2FF801] border-none px-3 py-1 text-[10px] font-bold uppercase tracking-widest">{strain.type}</Badge></div>
                  <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none mb-2">{strain.name}</h1>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.3em]">Verified Collective Edition</p>
                </div>
                <div className="flex justify-between items-end"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#00F5FF] animate-pulse" /><span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">Tap to Flip</span></div><RefreshCw size={16} className="text-[#00F5FF]/50" /></div>
              </div>
            </Card>
            <Card className="absolute inset-0 rotate-y-180 backface-hidden overflow-hidden border-2 rounded-[2.5rem] bg-[#1a191b] border-[#2FF801] ring-8 ring-[#2FF801]/10 shadow-[0_0_50px_rgba(47,248,1,0.15)]">
              <div className="p-8 h-full flex flex-col justify-between">
                <div><h3 className="text-[#2FF801] font-bold tracking-widest text-xs uppercase mb-6">Strain Profile</h3>
                  <div className="space-y-6">
                    <div><p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-2">Description</p><p className="text-sm text-white/80 leading-relaxed font-medium italic">"{strain.description}"</p></div>
                    <div><p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-2">Terpenes</p><div className="flex flex-wrap gap-2">{strain.terpenes?.map((t: string) => (<Badge key={t} variant="secondary" className="bg-[#2FF801]/10 text-[#2FF801] border-none font-bold text-[10px] px-3">{t}</Badge>))}</div></div>
                  </div>
                </div>
                <div className="pt-6 border-t border-white/5 flex justify-between items-center"><span className="text-[10px] text-[#2FF801] font-bold uppercase tracking-tighter">Certified Data</span><Info size={20} className="text-white/20" /></div>
              </div>
            </Card>
          </div>
        </div>

        <div className="w-full max-w-[340px] mt-10 space-y-4">
          <button onClick={addToLogbook} disabled={isSaving || hasCollected} className={`w-full font-black py-4 rounded-2xl uppercase tracking-widest transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3 ${hasCollected ? "bg-[#2FF801]/10 text-[#2FF801] border border-[#2FF801]/30 cursor-default" : "bg-white text-black hover:bg-[#00F5FF]"}`}>
            {isSaving ? <Loader2 className="animate-spin" /> : hasCollected ? <><CheckCircle2 size={20} /> In der Sammlung</> : "In mein Logbuch eintragen"}
          </button>
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
