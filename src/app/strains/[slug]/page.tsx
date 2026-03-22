"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Info, RefreshCw, Star, Loader2, Heart, Share2, CheckCircle2, Flame, Wind, Eye } from "lucide-react";

export default function StrainDetailPage() {
  const { slug } = useParams();
  const { user, isDemoMode } = useAuth();
  const router = useRouter();
  
  const [strain, setStrain] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasCollected, setHasCollected] = useState(false);
  
  // Rating State
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratings, setRatings] = useState({
    taste: 5,
    effect: 5,
    look: 5
  });

  useEffect(() => {
    async function fetchStrain() {
      if (isDemoMode) {
        setStrain({ id: "sim-1", name: "Godfather OG", slug: "godfather-og", type: "indica", thc_max: 34, description: "Simulation Mode", terpenes: ["Myrcene"], effects: ["Sleep"], image_url: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?auto=format&fit=crop&q=80&w=800" });
        setLoading(false);
        return;
      }

      const { data } = await supabase.from("strains").select("*").eq("slug", slug).single();
      if (data) {
        setStrain(data);
        if (user) {
          const { data: r } = await supabase.from("ratings").select("id").eq("strain_id", data.id).eq("user_id", user.id).single();
          if (r) setHasCollected(true);
        }
      }
      setLoading(false);
    }
    fetchStrain();
  }, [slug, user, isDemoMode]);

  const saveRating = async () => {
    if (isDemoMode) {
      setIsSaving(true);
      setTimeout(() => {
        setHasCollected(true);
        setShowRatingModal(false);
        setIsSaving(false);
      }, 1000);
      return;
    }

    setIsSaving(true);
    try {
      // Profil sicherstellen
      const { data: profile } = await supabase.from("profiles").select("id").eq("id", user?.id).single();
      if (!profile && user) {
        await supabase.from("profiles").insert({ id: user.id, username: user.email?.split("@")[0] || "user", display_name: user.email?.split("@")[0] });
      }

      const { error } = await supabase.from("ratings").upsert({
        strain_id: strain.id,
        user_id: user?.id,
        overall_rating: Math.round((ratings.taste + ratings.effect + ratings.look) / 3),
        taste_rating: ratings.taste,
        effect_rating: ratings.effect,
        look_rating: ratings.look
      });

      if (error) throw error;
      setHasCollected(true);
      setShowRatingModal(false);
    } catch (err) {
      alert("Fehler beim Speichern.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0e0e0f] flex items-center justify-center"><Loader2 className="animate-spin text-[#00F5FF]" size={40} /></div>;

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white pb-32">
      {/* Top Bar */}
      <div className="p-6 flex justify-between items-center sticky top-0 z-50 bg-[#0e0e0f]/80 backdrop-blur-xl">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-white/5"><ChevronLeft size={24} /></button>
        <div className="flex gap-2">
          <button className="p-2 rounded-full bg-white/5 text-red-500"><Heart size={20} /></button>
          <button className="p-2 rounded-full bg-white/5 text-[#00F5FF]"><Share2 size={20} /></button>
        </div>
      </div>

      <div className="px-6 flex flex-col items-center">
        {/* Card View */}
        <div className="relative w-full max-w-[340px] aspect-[3/4.5] perspective-1000 mt-4 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            <Card className="absolute inset-0 backface-hidden overflow-hidden border-2 rounded-[2.5rem] bg-[#1a191b] border-[#00F5FF] ring-8 ring-[#00F5FF]/10 shadow-[0_0_50px_rgba(0,245,255,0.15)]">
              <div className="absolute inset-0 card-holo opacity-50 pointer-events-none" />
              <div className="h-3/5 relative">
                <img src={strain.image_url} alt={strain.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a191b] via-transparent to-transparent" />
                <div className="absolute top-6 right-6 bg-black/80 backdrop-blur-xl border border-[#00F5FF]/50 rounded-2xl p-3 flex flex-col items-center">
                  <span className="text-[8px] text-[#00F5FF] font-black uppercase mb-1">THC</span>
                  <span className="text-xl font-black">{strain.thc_max}%</span>
                </div>
              </div>
              <div className="p-8 flex flex-col h-2/5 justify-between">
                <div>
                  <Badge className="bg-[#2FF801]/10 text-[#2FF801] border-none px-3 py-1 text-[10px] font-bold uppercase mb-2">{strain.type}</Badge>
                  <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">{strain.name}</h1>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00F5FF] animate-pulse" />
                  <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase italic">Tap to Flip</span>
                </div>
              </div>
            </Card>
            {/* Back View */}
            <Card className="absolute inset-0 rotate-y-180 backface-hidden overflow-hidden border-2 rounded-[2.5rem] bg-[#1a191b] border-[#2FF801] ring-8 ring-[#2FF801]/10 shadow-[0_0_50px_rgba(47,248,1,0.15)]">
              <div className="p-8 h-full flex flex-col justify-between">
                <div><h3 className="text-[#2FF801] font-bold tracking-widest text-xs uppercase mb-6">Strain Data</h3>
                  <div className="space-y-6">
                    <div><p className="text-[10px] text-white/30 uppercase font-black mb-2">Lineage</p><p className="text-sm font-medium italic text-white/80 leading-relaxed">{strain.description}</p></div>
                    <div><p className="text-[10px] text-white/30 uppercase font-black mb-2">Terpenes</p><div className="flex flex-wrap gap-2">{strain.terpenes?.map((t: string) => (<Badge key={t} variant="secondary" className="bg-[#2FF801]/10 text-[#2FF801] border-none text-[10px] font-bold">{t}</Badge>))}</div></div>
                  </div>
                </div>
                <div className="pt-6 border-t border-white/5 flex justify-between items-center"><span className="text-[10px] text-[#2FF801] font-black uppercase">Verified Bud</span><Info size={20} className="text-white/20" /></div>
              </div>
            </Card>
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full max-w-[340px] mt-10">
          <button 
            onClick={() => !hasCollected && setShowRatingModal(true)}
            disabled={hasCollected}
            className={`w-full font-black py-5 rounded-2xl uppercase tracking-[0.2em] transition-all active:scale-95 shadow-2xl flex items-center justify-center gap-3 ${
              hasCollected 
                ? "bg-[#2FF801]/10 text-[#2FF801] border border-[#2FF801]/30" 
                : "bg-white text-black hover:bg-[#00F5FF]"
            }`}
          >
            {hasCollected ? <><CheckCircle2 size={24} /> In der Sammlung</> : "Jetzt Sammeln & Bewerten"}
          </button>
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowRatingModal(false)} />
          <Card className="relative w-full max-w-md bg-[#1a191b] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-8 space-y-8 animate-in slide-in-from-bottom duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase text-[#00F5FF]">Tasting Log</h2>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">Gib deine Expertise ab</p>
            </div>

            <div className="space-y-6">
              {/* Rating Rows */}
              {[
                { label: "Geschmack", icon: <Flame size={18} />, key: "taste", color: "text-orange-500" },
                { label: "Wirkung", icon: <Wind size={18} />, key: "effect", color: "text-cyan-500" },
                { label: "Look", icon: <Eye size={18} />, key: "look", color: "text-[#2FF801]" }
              ].map((row) => (
                <div key={row.key} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className={`flex items-center gap-2 ${row.color} text-[10px] font-black uppercase tracking-widest`}>
                      {row.icon} {row.label}
                    </div>
                    <span className="text-[#00F5FF] font-mono font-bold text-sm">{(ratings as any)[row.key]}/5</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star}
                        onClick={() => setRatings({...ratings, [row.key]: star})}
                        className={`flex-1 h-10 rounded-lg border transition-all ${
                          (ratings as any)[row.key] >= star 
                            ? "bg-white/10 border-[#00F5FF]/50 text-[#00F5FF]" 
                            : "bg-black/40 border-white/5 text-white/10"
                        }`}
                      >
                        <Star size={16} fill={(ratings as any)[row.key] >= star ? "currentColor" : "none"} className="mx-auto" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={saveRating}
              disabled={isSaving}
              className="w-full h-16 bg-[#00F5FF] text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[#00F5FF]/80 transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,245,255,0.3)]"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : "LOGBUCH ABSCHLIESSEN +50 XP"}
            </button>
          </Card>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
