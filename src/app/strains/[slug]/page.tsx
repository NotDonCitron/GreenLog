"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Info, RefreshCw, Star, Loader2, Heart, CheckCircle2, Upload, Flame, Wind, Eye, Leaf } from "lucide-react";
import { Strain } from "@/lib/types";

export default function StrainDetailPage() {
  const { slug } = useParams();
  const { user, isDemoMode } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [strain, setStrain] = useState<Strain | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFavorited, setIsFavorite] = useState(false);
  const [hasCollected, setHasCollected] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [batchInfo, setBatchInfo] = useState("");
  const [userNotes, setUserNotes] = useState("");
  
  const [ratings, setRatings] = useState({
    taste: 4.5,
    effect: 4.5,
    look: 4.5
  });

  const handleStarClick = (key: keyof typeof ratings, value: number) => {
    setRatings(prev => ({
      ...prev,
      [key]: prev[key] === value ? value - 0.5 : value
    }));
  };

  useEffect(() => {
    async function fetchStrain() {
      // Always try to fetch the real strain first, even in demo mode
      const { data, error } = await supabase.from("strains").select("*").eq("slug", slug).single();
      
      if (data) {
        setStrain(data as Strain);
        if (user) {
          const { data: r } = await supabase.from("ratings").select("id").eq("strain_id", data.id).eq("user_id", user.id).single();
          if (r) setHasCollected(true);

          const { data: fav } = await supabase.from("user_strain_relations").select("is_favorite").eq("strain_id", data.id).eq("user_id", user.id).single();
          if (fav) setIsFavorite(fav.is_favorite);
        }
      } else if (isDemoMode) {
        // Fallback for demo mode only if strain not found
        setStrain({ 
          id: "sim-1", 
          name: (slug as string).split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '), 
          slug: slug as string, 
          type: "hybrid", 
          thc_max: 25, 
          description: "Simulation Mode: This is a placeholder description for the demo experience.", 
          image_url: `/strains/${slug}.jpg` 
        });
      }
      setLoading(false);
    }
    fetchStrain();
  }, [slug, user, isDemoMode]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !strain) return;
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${strain.slug}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('strains').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('strains').getPublicUrl(fileName);
      await supabase.from('strains').update({ image_url: publicUrl }).eq('id', strain.id);
      setStrain({ ...strain, image_url: publicUrl });
      alert("Image updated!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleFavorite = async () => {
    if (isDemoMode) {
      setIsFavorite(!isFavorited);
      return;
    }
    if (!user || !strain) return;
    
    const nextState = !isFavorited;
    setIsFavorite(nextState);
    
    try {
      await supabase.from("user_strain_relations").upsert({
        user_id: user.id,
        strain_id: strain.id,
        is_favorite: nextState
      }, { onConflict: 'user_id,strain_id' });
    } catch (err) {
      console.error("Fav error:", err);
    }
  };

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

    if (!user || !strain) {
      router.push("/login");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Ensure Profile
      const username = user.email?.split("@")[0] || "user_" + Math.random().toString(36).slice(2, 7);
      await supabase.from("profiles").upsert({ id: user.id, username, display_name: username }, { onConflict: 'id' });

      // 2. Save Rating (Public)
      const { error: rError } = await supabase.from("ratings").upsert({
        strain_id: strain.id,
        user_id: user.id,
        overall_rating: (ratings.taste + ratings.effect + ratings.look) / 3,
        taste_rating: ratings.taste,
        effect_rating: ratings.effect,
        look_rating: ratings.look
      }, { onConflict: 'strain_id,user_id' });

      if (rError) throw rError;

      // 3. Save to Personal Collection (Private)
      await supabase.from("user_collection").upsert({
        user_id: user.id,
        strain_id: strain.id,
        batch_info: batchInfo,
        user_notes: userNotes,
        user_thc_percent: strain.thc_max 
      }, { onConflict: 'user_id,strain_id' });

      // 4. Check & Unlock Badges
      const { data: allBadges } = await supabase.from('badges').select('*');
      const { data: userCollection } = await supabase.from('user_collection').select('*, strains(*)').eq('user_id', user.id);

      const unlockBadge = async (badgeName: string) => {
        const badge = allBadges?.find(b => b.name === badgeName);
        if (badge) {
          await supabase.from('user_badges').upsert({ user_id: user.id, badge_id: badge.id }, { onConflict: 'user_id,badge_id' });
        }
      };

      // Condition: Genesis (First strain)
      if (userCollection?.length === 1) await unlockBadge("Genesis");

      // Condition: High Flyer (>25% THC)
      if (strain.thc_max && strain.thc_max > 25) await unlockBadge("High Flyer");

      // Condition: Pharma Specialist (is_medical)
      if (strain.is_medical) await unlockBadge("Pharma Specialist");

      // Condition: Indica Knight (5 Indicas)
      const indicaCount = userCollection?.filter(item => item.strains?.type === 'indica').length || 0;
      if (indicaCount >= 5) await unlockBadge("Indica Knight");

      // Condition: Sativa Scout (5 Sativas)
      const sativaCount = userCollection?.filter(item => item.strains?.type === 'sativa').length || 0;
      if (sativaCount >= 5) await unlockBadge("Sativa Scout");

      setHasCollected(true);
      setShowRatingModal(false);
      router.refresh();
    } catch (err: any) {
      alert("Error saving: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0e0e0f] flex items-center justify-center"><Loader2 className="animate-spin text-[#00F5FF]" size={40} /></div>;
  if (!strain) return <div className="text-white text-center py-20 uppercase font-bold">Strain not found</div>;

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white pb-32">
      <div className="p-6 flex justify-between items-center sticky top-0 z-50 bg-[#0e0e0f]/80 backdrop-blur-xl">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-white/5"><ChevronLeft size={24} /></button>
        <div className="flex gap-2">
          {user && <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 rounded-full bg-[#00F5FF]/10 text-[#00F5FF] border border-[#00F5FF]/20"><Upload size={20} /></button>}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          <button 
            onClick={toggleFavorite}
            className={`p-2 rounded-full border transition-all ${isFavorited ? 'bg-red-500/20 border-red-500/40 text-red-500' : 'bg-white/5 border-white/5 text-white/40'}`}
          >
            <Heart size={20} fill={isFavorited ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <div className="px-6 flex flex-col items-center">
        <div className="relative w-full max-w-[340px] aspect-[3/4.5] perspective-1000 mt-4 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            <Card className="absolute inset-0 backface-hidden overflow-hidden border-2 rounded-[2.5rem] bg-[#1a191b] border-[#00F5FF] ring-8 ring-[#00F5FF]/10 shadow-[0_0_50px_rgba(0,245,255,0.2)]">
              <div className="absolute inset-0 card-holo opacity-50 pointer-events-none" />
              <div className="h-3/5 relative">
                {strain.image_url ? (
                  <img src={strain.image_url} alt={strain.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1a191b] to-black flex items-center justify-center">
                    <Leaf className="text-white/5" size={80} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a191b] via-transparent to-transparent" />
                {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="animate-spin text-[#00F5FF]" size={40} /></div>}
              </div>
              <div className="p-8 flex flex-col h-2/5 justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <Badge className="bg-[#2FF801]/10 text-[#2FF801] border-none px-3 py-1 text-[10px] font-bold uppercase">{strain.type}</Badge>
                    {strain.is_medical && (
                      <Badge className="bg-[#00F5FF]/10 text-[#00F5FF] border-none px-2 py-1 text-[8px] font-black uppercase tracking-tighter">Medical Grade</Badge>
                    )}
                  </div>
                  <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">{strain.name}</h1>
                  {strain.brand && <p className="text-[10px] font-bold text-[#00F5FF] uppercase tracking-widest mt-1">{strain.brand}</p>}
                </div>
                <div className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Tap to Flip</div>
              </div>
            </Card>
            <Card className="absolute inset-0 rotate-y-180 backface-hidden overflow-hidden border-2 rounded-[2.5rem] bg-[#1a191b] border-[#2FF801] ring-8 ring-[#2FF801]/10 shadow-[0_0_50px_rgba(47,248,1,0.15)]">
              <div className="p-8 h-full flex flex-col justify-between overflow-y-auto custom-scrollbar">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[#2FF801] font-bold tracking-widest text-xs uppercase">{strain.is_medical ? 'Medical Profile' : 'Strain Profile'}</h3>
                    {strain.thc_max && <Badge variant="outline" className="border-[#2FF801]/30 text-[#2FF801] text-[10px] font-mono">THC: ~{strain.thc_max}%</Badge>}
                  </div>
                  
                  <div className="space-y-5">
                    {strain.genetics && (
                      <div>
                        <p className="text-[9px] text-white/30 uppercase font-black mb-1">Genetics</p>
                        <p className="text-xs font-bold text-white/90 tracking-tight">{strain.genetics}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-[9px] text-white/30 uppercase font-black mb-1">Lineage & Effects</p>
                      <p className="text-[11px] font-medium italic text-white/70 leading-relaxed">{strain.description}</p>
                    </div>

                    {strain.indications && strain.indications.length > 0 && (
                      <div>
                        <p className="text-[9px] text-white/30 uppercase font-black mb-2">Common Indications</p>
                        <div className="flex flex-wrap gap-1.5">
                          {strain.indications.map(ind => (
                            <Badge key={ind} className="bg-white/5 text-white/60 border-white/10 text-[9px] font-bold">{ind}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-[9px] text-white/30 uppercase font-black mb-2">Terpenes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {strain.terpenes?.map((t: string) => (
                          <Badge key={t} variant="secondary" className="bg-[#2FF801]/10 text-[#2FF801] border-none text-[9px] font-bold">{t}</Badge>
                        ))}
                      </div>
                    </div>

                    {strain.manufacturer && (
                      <div className="pt-2">
                        <p className="text-[8px] text-white/20 uppercase font-bold">Manufacturer: {strain.manufacturer}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-white/5 flex justify-between items-center">
                  <span className="text-[10px] text-[#2FF801] font-black uppercase">{strain.is_medical ? 'Pharma Certified' : 'Verified Bud'}</span>
                  <Info size={18} className="text-white/20" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="w-full max-w-[340px] mt-10 space-y-4 text-center">
          <button 
            onClick={() => !hasCollected && setShowRatingModal(true)}
            disabled={hasCollected}
            className={`w-full font-black py-5 rounded-2xl uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 ${
              hasCollected ? "bg-[#2FF801]/10 text-[#2FF801] border border-[#2FF801]/30" : "bg-white text-black hover:bg-[#00F5FF]"
            }`}
          >
            {hasCollected ? <><CheckCircle2 size={24} /> In Collection</> : "Collect & Rate"}
          </button>
        </div>
      </div>

      {showRatingModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowRatingModal(false)} />
          <Card className="relative w-full max-w-md bg-[#1a191b] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-8 space-y-8 animate-in slide-in-from-bottom duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase text-[#00F5FF]">Tasting Log</h2>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Rate your experience</p>
            </div>
            <div className="space-y-6">
              {[
                { label: "Taste", icon: <Flame size={18} />, key: "taste", color: "text-orange-500" },
                { label: "Effect", icon: <Wind size={18} />, key: "effect", color: "text-cyan-500" },
                { label: "Look", icon: <Eye size={18} />, key: "look", color: "text-[#2FF801]" }
              ].map((row) => (
                <div key={row.key} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className={`flex items-center gap-2 ${row.color} text-[10px] font-black uppercase tracking-widest`}>{row.icon} {row.label}</div>
                    <span className="text-[#00F5FF] font-mono font-bold text-sm">{(ratings as any)[row.key]}/5</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => handleStarClick(row.key as keyof typeof ratings, star)} className={`flex-1 h-10 rounded-lg border transition-all ${(ratings as any)[row.key] >= star ? "bg-white/10 border-[#00F5FF]/50 text-[#00F5FF]" : "bg-black/40 border-white/5 text-white/10"}`}>
                        <Star size={16} fill={(ratings as any)[row.key] >= star ? "currentColor" : "none"} className="mx-auto" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Batch / Apotheke</label>
                <input 
                  type="text" 
                  placeholder="z.B. ABC-123 / Grünhorn"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-[#00F5FF]/50 transition-all"
                  value={batchInfo}
                  onChange={(e) => setBatchInfo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Notizen</label>
                <textarea 
                  placeholder="Wie war die Wirkung? Geschmack?"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-[#00F5FF]/50 transition-all min-h-[80px]"
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                />
              </div>
            </div>
            <button onClick={saveRating} disabled={isSaving} className="w-full h-16 bg-[#00F5FF] text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[#00F5FF]/80 transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,245,255,0.3)]">
              {isSaving ? <Loader2 className="animate-spin" /> : "COMPLETE LOG +50 XP"}
            </button>
          </Card>
        </div>
      )}
      <BottomNav />
    </main>
  );
}
