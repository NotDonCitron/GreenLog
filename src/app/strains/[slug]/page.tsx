"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Info, RefreshCw, Star, Loader2, Heart, Share2, CheckCircle2, Upload, Download, Flame, Wind, Eye, Leaf } from "lucide-react";
import { toPng } from 'html-to-image';
import { Strain } from "@/lib/types";

export default function StrainDetailPage() {
  const { slug } = useParams();
  const { user, isDemoMode } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hiddenCardRef = useRef<HTMLDivElement>(null);
  
  const [strain, setStrain] = useState<Strain | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasCollected, setHasCollected] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  
  const [ratings, setRatings] = useState({
    taste: 5,
    effect: 5,
    look: 5
  });

  useEffect(() => {
    async function fetchStrain() {
      // Always try to fetch the real strain first, even in demo mode
      const { data, error } = await supabase.from("strains").select("*").eq("slug", slug).single();
      
      if (data) {
        setStrain(data as Strain);
        if (user) {
          const { data: r } = await supabase.from("ratings").select("id").eq("strain_id", data.id).eq("user_id", user.id).single();
          if (r) setHasCollected(true);
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

  const handleExportImage = async () => {
    if (!hiddenCardRef.current || !strain) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(hiddenCardRef.current, { cacheBust: true, pixelRatio: 3, backgroundColor: '#0e0e0f' });
      const link = document.createElement('a');
      link.download = `greenlog-${strain.slug}-card.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

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
      // Robust profile ensuring: use upsert on ID
      const username = user.email?.split("@")[0] || "user_" + Math.random().toString(36).slice(2, 7);
      
      const { error: profileError } = await supabase.from("profiles").upsert({ 
        id: user.id, 
        username: username, 
        display_name: username 
      }, { onConflict: 'id' });
      
      if (profileError && profileError.code !== '23505') {
        console.error("Profile sync error:", profileError);
      }

      const { error } = await supabase.from("ratings").upsert({
        strain_id: strain.id,
        user_id: user.id,
        overall_rating: Math.round((ratings.taste + ratings.effect + ratings.look) / 3),
        taste_rating: ratings.taste,
        effect_rating: ratings.effect,
        look_rating: ratings.look
      }, { onConflict: 'strain_id,user_id' });

      if (error) {
        console.error("Rating upsert error:", error);
        throw error;
      }
      
      setHasCollected(true);
      setShowRatingModal(false);
      router.refresh();
    } catch (err: any) {
      alert("Error saving rating: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0e0e0f] flex items-center justify-center"><Loader2 className="animate-spin text-[#00F5FF]" size={40} /></div>;
  if (!strain) return <div className="text-white text-center py-20 uppercase font-bold">Strain not found</div>;

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white pb-32">
      {/* HIDDEN CLEAN CARD FOR EXPORT */}
      <div ref={hiddenCardRef} className="absolute left-[-9999px] top-0 p-20 bg-[#0e0e0f]" style={{ width: '500px' }}>
        <div className="relative w-full aspect-[3/4.5]">
          <Card className="absolute inset-0 overflow-hidden border-2 rounded-[2.5rem] bg-[#1a191b] border-[#00F5FF] shadow-[0_0_50px_rgba(0,245,255,0.2)]">
            <div className="h-3/5 relative">
              <img src={strain.image_url} alt={strain.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a191b] via-transparent to-transparent" />
            </div>
            <div className="p-10 flex flex-col h-2/5 justify-between text-left">
              <div><Badge className="bg-[#2FF801]/10 text-[#2FF801] border-none px-3 py-1 text-xs font-bold uppercase mb-4">{strain.type}</Badge>
              <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none text-white">{strain.name}</h1></div>
              <div className="text-xs font-bold text-white/20 tracking-widest uppercase">GreenLog Collection</div>
            </div>
          </Card>
        </div>
      </div>

      <div className="p-6 flex justify-between items-center sticky top-0 z-50 bg-[#0e0e0f]/80 backdrop-blur-xl">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-white/5"><ChevronLeft size={24} /></button>
        <div className="flex gap-2">
          {user && <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 rounded-full bg-[#00F5FF]/10 text-[#00F5FF] border border-[#00F5FF]/20"><Upload size={20} /></button>}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          <button className="p-2 rounded-full bg-white/5 text-red-500"><Heart size={20} /></button>
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
                <div><Badge className="bg-[#2FF801]/10 text-[#2FF801] border-none px-3 py-1 text-[10px] font-bold uppercase mb-2">{strain.type}</Badge>
                <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">{strain.name}</h1></div>
                <div className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Tap to Flip</div>
              </div>
            </Card>
            <Card className="absolute inset-0 rotate-y-180 backface-hidden overflow-hidden border-2 rounded-[2.5rem] bg-[#1a191b] border-[#2FF801] ring-8 ring-[#2FF801]/10 shadow-[0_0_50px_rgba(47,248,1,0.15)]">
              <div className="p-8 h-full flex flex-col justify-between">
                <div><h3 className="text-[#2FF801] font-bold tracking-widest text-xs uppercase mb-6">Strain Profile</h3>
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
          
          <button onClick={handleExportImage} disabled={isExporting} className="w-full py-4 rounded-2xl border border-white/10 bg-white/5 text-white/60 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
            {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            {isExporting ? "Exporting..." : "Download as Image"}
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
                      <button key={star} onClick={() => setRatings({...ratings, [row.key as keyof typeof ratings]: star})} className={`flex-1 h-10 rounded-lg border transition-all ${(ratings as any)[row.key] >= star ? "bg-white/10 border-[#00F5FF]/50 text-[#00F5FF]" : "bg-black/40 border-white/5 text-white/10"}`}>
                        <Star size={16} fill={(ratings as any)[row.key] >= star ? "currentColor" : "none"} className="mx-auto" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
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
