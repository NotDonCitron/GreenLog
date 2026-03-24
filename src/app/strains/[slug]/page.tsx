"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Info, RefreshCw, Star, Loader2, Heart, CheckCircle2, Upload, Flame, Wind, Eye, Leaf, Database, Sparkles, Share2, Download, Trash2 } from "lucide-react";
import { Strain } from "@/lib/types";

export default function StrainDetailPage() {
  const { slug } = useParams();
  const { user, isDemoMode } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [strain, setStrain] = useState<Strain | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFavorited, setIsFavorite] = useState(false);
  const [hasCollected, setHasCollected] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [batchInfo, setBatchInfo] = useState("");
  const [userNotes, setUserNotes] = useState("");
  const [badgeToast, setBadgeToast] = useState<{ name: string; rarity: string } | null>(null);
  const [isSharing, setIsSharing] = useState(false);

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
      const { data, error } = await supabase.from("strains").select("*").eq("slug", slug).single();

      if (data) {
        setStrain(data as Strain);
        if (user) {
          const { data: r } = await supabase.from("ratings").select("id").eq("strain_id", data.id).eq("user_id", user.id).single();
          if (r) setHasCollected(true);

          const { data: fav } = await supabase.from("user_strain_relations").select("is_favorite").eq("strain_id", data.id).eq("user_id", user.id).single();
          if (fav) setIsFavorite(fav.is_favorite);

          const { data: collection } = await supabase.from("user_collection").select("user_image_url, batch_info, user_notes").eq("strain_id", data.id).eq("user_id", user.id).maybeSingle();
          if (collection) {
            if (collection.user_image_url) setUserImageUrl(collection.user_image_url);
            setBatchInfo(collection.batch_info || "");
            setUserNotes(collection.user_notes || "");
          }
        }
      } else if (isDemoMode) {
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

  const handleDelete = async () => {
    if (!strain || !user || isDemoMode) return;
    
    const confirmDelete = window.confirm(`Möchtest du die Sorte "${strain.name}" wirklich unwiderruflich löschen? Alle Bewertungen und Log-Einträge gehen verloren.`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      // 1. Alle Referenzen löschen
      await supabase.from("user_strain_relations").delete().eq("strain_id", strain.id);
      await supabase.from("user_collection").delete().eq("strain_id", strain.id);
      await supabase.from("ratings").delete().eq("strain_id", strain.id);
      await supabase.from("user_activities").delete().eq("target_id", String(strain.id));

      // 2. Die Sorte selbst löschen
      const { error: mainError } = await supabase.from("strains").delete().eq("id", strain.id);
      if (mainError) throw mainError;

      // 3. Hartes Update der UI
      window.location.href = "/strains";

    } catch (err: any) {
      console.error("Critical delete error:", err);
      alert("Löschen fehlgeschlagen: " + (err.message || "Unbekannter Fehler"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !strain) return;
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${strain.slug}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('strains').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('strains').getPublicUrl(fileName);
      setUserImageUrl(publicUrl);

      if (hasCollected) {
        await supabase.from('user_collection').update({ user_image_url: publicUrl }).eq('strain_id', strain.id).eq('user_id', user.id);
      }
      alert("Foto hochgeladen!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!user || !strain || isDemoMode) {
      if (isDemoMode) setIsFavorite(!isFavorited);
      return;
    }
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

  const handleShareCard = async () => {
    if (!cardRef.current || !strain) return;
    setIsSharing(true);
    try {
      const wasFlipped = isFlipped;
      if (wasFlipped) setIsFlipped(false);
      await new Promise(resolve => setTimeout(resolve, 150));

      const dataUrl = await toPng(cardRef.current, { quality: 1, pixelRatio: 2, backgroundColor: '#1a191b' });

      if (navigator.share) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `${strain.slug}-card.png`, { type: 'image/png' });
        await navigator.share({ files: [file], title: strain.name });
      } else {
        const link = document.createElement('a');
        link.download = `${strain.slug}-card.png`;
        link.href = dataUrl;
        link.click();
      }
      if (wasFlipped) setIsFlipped(true);
    } catch (err) {
      console.error("Share error:", err);
    } finally {
      setIsSharing(false);
    }
  };

  const saveRating = async () => {
    if (!user || !strain || isDemoMode) return;
    setIsSaving(true);
    try {
      const username = user.email?.split("@")[0] || "user_" + Math.random().toString(36).slice(2, 7);
      await supabase.from("profiles").upsert({ id: user.id, username, display_name: username }, { onConflict: 'id' });

      const { error: rError } = await supabase.from("ratings").upsert({
        strain_id: strain.id,
        user_id: user.id,
        overall_rating: (ratings.taste + ratings.effect + ratings.look) / 3,
        taste_rating: ratings.taste,
        effect_rating: ratings.effect,
        look_rating: ratings.look
      }, { onConflict: 'strain_id,user_id' });

      if (rError) throw rError;

      await supabase.from("user_collection").upsert({
        user_id: user.id,
        strain_id: strain.id,
        batch_info: batchInfo,
        user_notes: userNotes,
        user_thc_percent: strain.avg_thc || strain.thc_max,
        user_image_url: userImageUrl
      }, { onConflict: 'user_id,strain_id' });

      setHasCollected(true);
      setShowRatingModal(false);
      router.refresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const typeStr = (strain?.type || '').toLowerCase();
  let themeClass = 'theme-cyan';
  let imageFilter = '';
  let badgeClasses = 'border-[#00FFFF] text-[#00FFFF]';
  let underlineBg = 'bg-[#00FFFF]';

  if (typeStr.includes('sativa')) {
    themeClass = 'theme-gold';
    imageFilter = 'saturate-50 contrast-125';
    badgeClasses = 'border-yellow-500 text-yellow-500';
    underlineBg = 'bg-[#fbbf24]';
  } else if (typeStr.includes('indica')) {
    themeClass = 'theme-emerald';
    imageFilter = 'grayscale-[0.2]';
    badgeClasses = 'border-emerald-400 text-emerald-400';
    underlineBg = 'bg-[#10b981]';
  }

  const thcValue = strain?.avg_thc ?? strain?.thc_max;
  const cbdValue = strain?.avg_cbd ?? strain?.cbd_max;

  const extractDisplayName = (value: unknown) => {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return null;
    if ('name' in value) return (value as any).name;
    if ('label' in value) return (value as any).label;
    return null;
  };

  const normalizedEffects = Array.isArray(strain?.effects) ? strain.effects.map(e => extractDisplayName(e)).filter(Boolean) : [];
  const normalizedTerpenes = Array.isArray(strain?.terpenes) ? strain.terpenes.map(t => extractDisplayName(t)).filter(Boolean) : [];

  const thcDisplay = typeof thcValue === 'number' ? `${thcValue}%` : '—';
  const cbdDisplay = typeof cbdValue === 'number' ? `${cbdValue}%` : '< 1%';
  const tasteDisplay = normalizedTerpenes.length > 0 ? normalizedTerpenes.slice(0, 2).join(' · ') : 'Zitrus, Erdig';
  const effectDisplay = normalizedEffects[0] || (strain?.is_medical ? "Medical" : "Euphorie");

  if (loading) return <div className="min-h-screen bg-[#355E3B] flex items-center justify-center"><Loader2 className="animate-spin text-[#00F5FF]" size={40} /></div>;
  if (!strain) return <div className="text-white text-center py-20 uppercase font-bold">Strain not found</div>;

  return (
    <main className="min-h-screen bg-[#355E3B] text-white pb-32">
      <div className="p-6 flex justify-between items-center sticky top-0 z-50 bg-[#355E3B]/80 backdrop-blur-xl">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-white/5"><ChevronLeft size={24} /></button>
        <div className="flex gap-2">
          <button onClick={handleShareCard} disabled={isSharing} className="p-2 rounded-full bg-[#2FF801]/10 text-[#2FF801] border border-[#2FF801]/20">
            {isSharing ? <Loader2 size={20} className="animate-spin" /> : <Share2 size={20} />}
          </button>
          {user && <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 rounded-full bg-[#00F5FF]/10 text-[#00F5FF] border border-[#00F5FF]/20"><Upload size={20} /></button>}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          <button onClick={toggleFavorite} className={`p-2 rounded-full border transition-all ${isFavorited ? 'bg-red-500/20 border-red-500/40 text-red-500' : 'bg-white/5 border-white/5 text-white/40'}`}>
            <Heart size={20} fill={isFavorited ? "currentColor" : "none"} />
          </button>
          {user && strain?.created_by === user.id && (
            <button onClick={handleDelete} disabled={isDeleting} className="p-2 rounded-full border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all">
              {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
            </button>
          )}
        </div>
      </div>

      <div className="px-6 flex flex-col items-center">
        <div ref={cardRef} className="relative w-full max-w-[340px] aspect-[3/4.5] perspective-1000 mt-4 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            <Card className={`absolute inset-0 backface-hidden overflow-hidden rounded-[2.5rem] premium-card ${themeClass} flex flex-col w-full h-full p-0 border-0 ${hasCollected ? 'ring-[3px] ring-white/20 shadow-2xl' : ''}`}>
              <div className="p-6 pb-4 z-20">
                <h2 className="title-font italic text-3xl text-white font-bold leading-tight uppercase drop-shadow-lg line-clamp-2">{strain.name}</h2>
                <div className={`w-12 h-1 mt-3 opacity-70 ${underlineBg}`}></div>
              </div>
              <div className="px-5 w-full shrink-0 z-20">
                <div className="relative w-full h-[220px] rounded-[1.5rem] overflow-hidden border border-white/10 shadow-lg">
                  <img src={userImageUrl || strain.image_url || "/strains/placeholder-1.svg"} alt={strain.name} className={`w-full h-full object-cover ${imageFilter}`} />
                  <div className={`absolute bottom-3 left-3 border bg-black/95 uppercase text-[11px] px-2.5 py-1 rounded-sm tracking-wider font-bold shadow-md ${badgeClasses}`}>{strain.type || 'HYBRID'}</div>
                </div>
              </div>
              <div className="px-5 mt-5 w-full flex-grow flex flex-col justify-end pb-6 z-20">
                <div className="bg-[#1a191b]/95 border border-white/10 rounded-2xl p-4 shadow-lg">
                  <div className="grid grid-cols-2 gap-3 border-b border-white/5 pb-3 mb-3">
                    <div className="flex items-center justify-between"><span className="text-gray-500 text-[11px] uppercase tracking-widest font-semibold mr-1">THC</span><span className="accent-text text-[15px] font-bold">{thcDisplay}</span></div>
                    <div className="flex items-center justify-end border-l border-white/5 pl-3 w-full"><span className="text-gray-100 text-xs text-right">{tasteDisplay}</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between"><span className="text-gray-500 text-[11px] uppercase tracking-widest font-semibold mr-1">CBD</span><span className="accent-text text-[15px] font-bold">{cbdDisplay}</span></div>
                    <div className="flex items-center justify-end border-l border-white/5 pl-3 w-full"><span className="text-gray-100 text-xs text-right">{effectDisplay}</span></div>
                  </div>
                </div>
              </div>
            </Card>
            <Card className="absolute inset-0 rotate-y-180 backface-hidden overflow-hidden border-2 rounded-[2.5rem] bg-[#1a191b] border-[#2FF801] p-8 h-full flex flex-col justify-between">
               <div>
                  <h3 className="text-[#2FF801] font-bold tracking-widest text-xs uppercase mb-6">Strain Profile</h3>
                  <div className="space-y-5">
                    <p className="text-[11px] font-medium italic text-white/70 leading-relaxed">{strain.description}</p>
                    {(userNotes || batchInfo) && (
                      <div className="pt-4 border-t border-white/10 mt-2 space-y-4">
                        <div className="flex items-center gap-2 text-[#00F5FF]"><Database size={12} /><h4 className="text-[10px] font-black uppercase">Mein Journal</h4></div>
                        {batchInfo && <p className="text-[10px] font-bold text-white/90">{batchInfo}</p>}
                        {userNotes && <p className="text-[10px] italic text-white/70 bg-white/5 p-3 rounded-xl">{userNotes}</p>}
                      </div>
                    )}
                  </div>
               </div>
               <div className="mt-auto pt-4 flex justify-center items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                 <RefreshCw size={12} className="animate-spin-slow" /> Tap to Flip
               </div>
            </Card>
          </div>
        </div>

        <div className="w-full max-w-[340px] mt-10">
          <button onClick={() => !hasCollected && setShowRatingModal(true)} disabled={hasCollected} className={`w-full font-black py-5 rounded-2xl uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${hasCollected ? "bg-[#2FF801]/10 text-[#2FF801] border border-[#2FF801]/30" : "bg-white text-black hover:bg-[#00F5FF]"}`}>
            {hasCollected ? <><CheckCircle2 size={24} /> In Collection</> : "Collect & Rate"}
          </button>
        </div>
      </div>

      {showRatingModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowRatingModal(false)} />
          <Card className="relative w-full max-w-md bg-[#1a191b] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-8 space-y-8 shadow-2xl">
            <h2 className="text-2xl font-black italic uppercase text-[#00F5FF] text-center">Tasting Log</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Batch / Apotheke" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white" value={batchInfo} onChange={(e) => setBatchInfo(e.target.value)} />
              <textarea placeholder="Deine Notizen..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white min-h-[100px]" value={userNotes} onChange={(e) => setUserNotes(e.target.value)} />
            </div>
            <button onClick={saveRating} disabled={isSaving} className="w-full h-16 bg-[#00F5FF] text-black font-black uppercase rounded-2xl flex items-center justify-center gap-3">
              {isSaving ? <Loader2 className="animate-spin" /> : "SAVE LOG"}
            </button>
          </Card>
        </div>
      )}
      <BottomNav />
    </main>
  );
}
