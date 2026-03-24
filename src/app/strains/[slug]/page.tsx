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
      // Always try to fetch the real strain first, even in demo mode
      const { data, error } = await supabase.from("strains").select("*").eq("slug", slug).single();

      if (data) {
        setStrain(data as Strain);
        if (user) {
          const { data: r } = await supabase.from("ratings").select("id").eq("strain_id", data.id).eq("user_id", user.id).single();
          if (r) setHasCollected(true);

          const { data: fav } = await supabase.from("user_strain_relations").select("is_favorite").eq("strain_id", data.id).eq("user_id", user.id).single();
          if (fav) setIsFavorite(fav.is_favorite);

          // Fetch personal photo and notes
          const { data: collection } = await supabase.from("user_collection").select("user_image_url, batch_info, user_notes").eq("strain_id", data.id).eq("user_id", user.id).maybeSingle();
          if (collection) {
            console.log("Personal Log found:", collection);
            if (collection.user_image_url) setUserImageUrl(collection.user_image_url);
            setBatchInfo(collection.batch_info || "");
            setUserNotes(collection.user_notes || "");
          }
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

  const handleDelete = async () => {
    if (!strain || !user || isDemoMode) return;
    
    const confirmDelete = window.confirm(`Möchtest du die Sorte "${strain.name}" wirklich unwiderruflich löschen? Alle Bewertungen und Log-Einträge gehen verloren.`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      // 1. Alle Ratings & Collection Einträge für diese Sorte löschen (Cascade manuell falls nötig)
      await supabase.from("ratings").delete().eq("strain_id", strain.id);
      await supabase.from("user_collection").delete().eq("strain_id", strain.id);
      await supabase.from("user_strain_relations").delete().eq("strain_id", strain.id);

      // 2. Die Sorte selbst löschen
      const { error } = await supabase.from("strains").delete().eq("id", strain.id);
      
      if (error) throw error;

      alert("Sorte erfolgreich gelöscht.");
      router.push("/strains");
    } catch (err: any) {
      console.error("Delete error:", err);
      alert("Fehler beim Löschen: " + err.message);
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

      // Update local state immediately
      setUserImageUrl(publicUrl);

      // If already collected, update DB immediately
      if (hasCollected) {
        await supabase.from('user_collection').update({ user_image_url: publicUrl }).eq('strain_id', strain.id).eq('user_id', user.id);
      }

      alert("Foto hochgeladen! Klicke auf 'Complete Log' um es zu speichern.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleFavorite = async () => {
    console.log("toggleFavorite called, isDemoMode:", isDemoMode, "user:", !!user, "strain:", !!strain);

    if (isDemoMode) {
      setIsFavorite(!isFavorited);
      console.log("Demo mode - toggled locally to:", !isFavorited);
      return;
    }
    if (!user || !strain) {
      console.log("No user or strain, returning");
      return;
    }

    const nextState = !isFavorited;
    setIsFavorite(nextState);

    try {
      const { data, error } = await supabase.from("user_strain_relations").upsert({
        user_id: user.id,
        strain_id: strain.id,
        is_favorite: nextState
      }, { onConflict: 'user_id,strain_id' });

      console.log("Fav toggle result:", { data, error, nextState });
    } catch (err) {
      console.error("Fav error:", err);
    }
  };

  const handleShareCard = async () => {
    if (!cardRef.current || !strain) return;
    setIsSharing(true);
    try {
      // Temporarily flip to front for capture
      const wasFlipped = isFlipped;
      if (wasFlipped) setIsFlipped(false);
      await new Promise(resolve => setTimeout(resolve, 100));

      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#1a191b',
      });

      // Try native share first
      if (navigator.share && navigator.canShare) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `${strain.slug}-card.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: strain.name,
            text: `Check out my ${strain.name} strain card from GreenLog!`,
          });
          if (wasFlipped) setIsFlipped(true);
          setIsSharing(false);
          return;
        }
      }

      // Fallback to download
      const link = document.createElement('a');
      link.download = `${strain.slug}-card.png`;
      link.href = dataUrl;
      link.click();

      if (wasFlipped) setIsFlipped(true);
    } catch (err) {
      console.error("Share error:", err);
      alert("Could not share card. Try downloading instead.");
    } finally {
      setIsSharing(false);
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
        user_thc_percent: strain.avg_thc || strain.thc_max,
        user_image_url: userImageUrl
      }, { onConflict: 'user_id,strain_id' });

      // 4. Check & Unlock Badges
      const { data: allBadges } = await supabase.from('badges').select('*');
      const { data: currentRatings } = await supabase.from('ratings').select('*, strain:strains(*)').eq('user_id', user.id);

      const unlockBadge = async (badgeName: string) => {
        const badge = allBadges?.find(b => b.name === badgeName);
        if (badge) {
          await supabase.from('user_badges').upsert({ user_id: user.id, badge_id: badge.id }, { onConflict: 'user_id,badge_id' });
          // Show toast notification
          setBadgeToast({ name: badge.name, rarity: badge.rarity || 'common' });
          setTimeout(() => setBadgeToast(null), 4000);
        }
      };

      // Condition: Genesis (First strain)
      if (currentRatings?.length === 1) await unlockBadge("Genesis");

      // Condition: High Flyer (>25% THC)
      if ((strain.avg_thc && strain.avg_thc > 25) || (strain.thc_max && strain.thc_max > 25)) {
        await unlockBadge("High Flyer");
      }

      // Condition: Pharma Specialist (is_medical)
      if (strain.is_medical) await unlockBadge("Pharma Specialist");

      // Condition: Indica Knight (5 Indicas)
      const indicaCount = currentRatings?.filter(item => (item.strain as any)?.type === 'indica').length || 0;
      if (indicaCount >= 5) await unlockBadge("Indica Knight");

      // Condition: Sativa Scout (5 Sativas)
      const sativaCount = currentRatings?.filter(item => (item.strain as any)?.type === 'sativa').length || 0;
      if (sativaCount >= 5) await unlockBadge("Sativa Scout");

      setHasCollected(true);
      setShowRatingModal(false);

      // Force immediate local update of notes so they appear on the card back
      // before the router.refresh() kicks in
      setUserNotes(userNotes);
      setBatchInfo(batchInfo);

      router.refresh();
    } catch (err: any) {
      alert("Error saving: " + (err.message || "Unknown error"));
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

    if ('name' in value) {
      const name = (value as { name?: unknown }).name;
      return typeof name === 'string' ? name : null;
    }

    if ('label' in value) {
      const label = (value as { label?: unknown }).label;
      return typeof label === 'string' ? label : null;
    }

    if ('title' in value) {
      const title = (value as { title?: unknown }).title;
      return typeof title === 'string' ? title : null;
    }

    if ('terpene' in value) {
      const nestedTerpene = (value as { terpene?: unknown }).terpene;
      if (nestedTerpene && typeof nestedTerpene === 'object' && 'name' in nestedTerpene) {
        const name = (nestedTerpene as { name?: unknown }).name;
        return typeof name === 'string' ? name : null;
      }
    }

    return null;
  };

  const extractPercent = (value: unknown) => {
    if (!value || typeof value !== 'object') return null;

    if ('percent' in value) {
      const percent = (value as { percent?: unknown }).percent;
      return typeof percent === 'number' ? percent : null;
    }

    if ('terpene' in value) {
      const nestedTerpene = (value as { terpene?: unknown }).terpene;
      if (nestedTerpene && typeof nestedTerpene === 'object' && 'percent' in nestedTerpene) {
        const percent = (nestedTerpene as { percent?: unknown }).percent;
        return typeof percent === 'number' ? percent : null;
      }
    }

    return null;
  };

  const normalizedEffects = Array.isArray(strain?.effects)
    ? strain.effects
      .map((effect) => extractDisplayName(effect))
      .filter((effect): effect is string => Boolean(effect))
    : [];

  const normalizedIndications = Array.isArray(strain?.indications)
    ? strain.indications
      .map((indication) => extractDisplayName(indication))
      .filter((indication): indication is string => Boolean(indication))
    : [];

  const normalizedTerpenes = Array.isArray(strain?.terpenes)
    ? strain.terpenes
      .map((terpene) => ({
        name: extractDisplayName(terpene),
        percent: extractPercent(terpene),
      }))
      .filter((terpene): terpene is { name: string; percent: number | null } => Boolean(terpene.name))
    : [];

  const thcDisplay = typeof thcValue === 'number' ? `${thcValue}%` : '—';
  const cbdDisplay = typeof cbdValue === 'number' ? `${cbdValue}%` : '< 1%';
  const effectDisplay = normalizedEffects[0] || normalizedIndications[0] || (strain?.is_medical ? "Medical" : "Euphorie");
  const tasteDisplay = normalizedTerpenes.length > 0 ? normalizedTerpenes.slice(0, 2).map((terpene) => terpene.name).join(' · ') : 'Zitrus, Erdig';

  if (loading) return <div className="min-h-screen bg-[#355E3B] flex items-center justify-center"><Loader2 className="animate-spin text-[#00F5FF]" size={40} /></div>;
  if (!strain) return <div className="text-white text-center py-20 uppercase font-bold">Strain not found</div>;

  return (
    <main className="min-h-screen bg-[#355E3B] text-white pb-32">
      {/* Badge Unlock Toast */}
      {badgeToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-gradient-to-r from-[#2FF801] to-[#00F5FF] text-black px-6 py-3 rounded-full font-bold flex items-center gap-3 shadow-lg shadow-[#2FF801]/20">
            <Sparkles size={20} className="animate-pulse" />
            <span>Badge Unlocked: {badgeToast.name}</span>
            <Badge className={`${badgeToast.rarity === 'legendary' ? 'bg-yellow-500 text-black' : badgeToast.rarity === 'rare' ? 'bg-blue-500 text-white' : 'bg-white/20 text-white'} border-none text-[10px]`}>
              {badgeToast.rarity}
            </Badge>
          </div>
        </div>
      )}

      <div className="p-6 flex justify-between items-center sticky top-0 z-50 bg-[#355E3B]/80 backdrop-blur-xl">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-white/5"><ChevronLeft size={24} /></button>
        <div className="flex gap-2">
          <button onClick={handleShareCard} disabled={isSharing} className="p-2 rounded-full bg-[#2FF801]/10 text-[#2FF801] border border-[#2FF801]/20">
            {isSharing ? <Loader2 size={20} className="animate-spin" /> : <Share2 size={20} />}
          </button>
          {user && <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 rounded-full bg-[#00F5FF]/10 text-[#00F5FF] border border-[#00F5FF]/20"><Upload size={20} /></button>}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          <button
            onClick={toggleFavorite}
            className={`p-2 rounded-full border transition-all ${isFavorited ? 'bg-red-500/20 border-red-500/40 text-red-500' : 'bg-white/5 border-white/5 text-white/40'}`}
          >
            <Heart size={20} fill={isFavorited ? "currentColor" : "none"} />
          </button>
          {user && strain?.created_by === user.id && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 rounded-full border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
            >
              {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
            </button>
          )}
        </div>
      </div>

      <div className="px-6 flex flex-col items-center">
        <div ref={cardRef} className="relative w-full max-w-[340px] aspect-[3/4.5] perspective-1000 mt-4 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            <Card className={`absolute inset-0 backface-hidden overflow-hidden rounded-[2.5rem] premium-card ${themeClass} flex flex-col w-full h-full p-0 border-0 ${hasCollected ? (themeClass === 'theme-cyan' ? 'ring-[3px] ring-[#00FFFF]/60 shadow-[0_0_40px_rgba(0,255,255,0.4)]' : themeClass === 'theme-gold' ? 'ring-[3px] ring-yellow-500/60 shadow-[0_0_40px_rgba(251,191,36,0.4)]' : 'ring-[3px] ring-emerald-500/60 shadow-[0_0_40px_rgba(16,185,129,0.4)]') : ''} transition-opacity duration-300 ${isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <div className="absolute inset-0 card-holo opacity-40 pointer-events-none z-10" />
              <div className="p-6 pb-4 z-20">
                <h2 className="title-font italic text-3xl text-white font-bold leading-tight uppercase drop-shadow-lg line-clamp-2">
                  {strain.name}
                </h2>
                <div className={`w-12 h-1 mt-3 opacity-70 ${underlineBg}`}></div>
              </div>

              <div className="px-5 w-full shrink-0 z-20">
                <div className="relative w-full h-[220px] rounded-[1.5rem] overflow-hidden border border-white/10 shadow-lg">
                  {userImageUrl ? (
                    <img src={userImageUrl} alt={strain.name} className={`w-full h-full object-cover ${imageFilter}`} />
                  ) : strain.image_url ? (
                    <img src={strain.image_url} alt={strain.name} className={`w-full h-full object-cover ${imageFilter}`} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1a191b] to-black flex items-center justify-center">
                      <Leaf className="text-white/5" size={80} />
                    </div>
                  )}
                  {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="animate-spin text-white" size={40} /></div>}
                  <div className={`absolute bottom-3 left-3 border bg-black/95 uppercase text-[11px] px-2.5 py-1 rounded-sm tracking-wider font-bold shadow-md ${badgeClasses}`}>
                    {strain.type || 'HYBRID'}
                  </div>
                </div>
              </div>

              <div className="px-5 mt-5 w-full flex-grow flex flex-col justify-end pb-6 z-20">
                <div className="bg-[#1a191b]/95 border border-white/10 rounded-2xl p-4 shadow-inner shadow-lg">
                  {/* Row 1: THC & Geschmack */}
                  <div className="grid grid-cols-2 gap-3 border-b border-white/5 pb-3 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-[11px] uppercase tracking-widest font-semibold flex-shrink-0 mr-1">THC</span>
                      <span className="accent-text text-[15px] font-bold tracking-wide">{thcDisplay}</span>
                    </div>
                    <div className="flex items-center justify-end border-l border-white/5 pl-3 w-full">
                      <span className="text-gray-100 text-xs font-medium tracking-wide leading-tight text-right text-balance">{tasteDisplay}</span>
                    </div>
                  </div>
                  {/* Row 2: CBD & Wirkung */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-[11px] uppercase tracking-widest font-semibold flex-shrink-0 mr-1">CBD</span>
                      <span className="accent-text text-[15px] font-bold tracking-wide">{cbdDisplay}</span>
                    </div>
                    <div className="flex items-center justify-end border-l border-white/5 pl-3 w-full">
                      <span className="text-gray-100 text-xs font-medium tracking-wide leading-tight text-right text-balance">{effectDisplay}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end mt-6 px-1">
                  <div className="text-[11px] font-bold text-white/50 uppercase tracking-widest animate-pulse">
                    TAP TO FLIP →
                  </div>
                </div>
              </div>
            </Card>
            <Card className={`absolute inset-0 rotate-y-180 backface-hidden overflow-hidden border-2 rounded-[2.5rem] bg-[#1a191b] border-[#2FF801] ring-8 ring-[#2FF801]/10 shadow-[0_0_50px_rgba(47,248,1,0.15)] transition-opacity duration-300 ${isFlipped ? 'opacity-100 delay-200' : 'opacity-0 pointer-events-none delay-0'}`}>
              <div className="p-8 h-full flex flex-col justify-between overflow-y-auto custom-scrollbar">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[#2FF801] font-bold tracking-widest text-xs uppercase">{strain.is_medical ? 'Medical Profile' : 'Strain Profile'}</h3>
                    {(strain.avg_thc || strain.thc_max) && (
                      <Badge variant="outline" className="border-[#2FF801]/30 text-[#2FF801] text-[10px] font-mono">
                        THC: ~{strain.avg_thc || strain.thc_max}%
                      </Badge>
                    )}
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

                    {normalizedIndications.length > 0 && (
                      <div>
                        <p className="text-[9px] text-white/30 uppercase font-black mb-2">Common Indications</p>
                        <div className="flex flex-wrap gap-1.5">
                          {normalizedIndications.map((ind, i) => (
                            <Badge key={i} className="bg-white/5 text-white/60 border-white/10 text-[9px] font-bold">{ind}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-[9px] text-white/30 uppercase font-black mb-2">Terpenes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {normalizedTerpenes.length > 0 ? (
                          normalizedTerpenes.map((terpene, i) => (
                            <Badge key={i} variant="secondary" className="bg-[#2FF801]/10 text-[#2FF801] border-none text-[9px] font-bold">
                              {terpene.name}{terpene.percent ? ` (${terpene.percent}%)` : ''}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[10px] text-white/20 italic">Keine Terpen-Daten verfügbar</span>
                        )}
                      </div>
                    </div>

                    {strain.manufacturer && (
                      <div className="pt-2">
                        <p className="text-[8px] text-white/20 uppercase font-bold">Manufacturer: {strain.manufacturer}</p>
                      </div>
                    )}

                    {/* PERSONAL LOG SECTION */}
                    {(userNotes || batchInfo) && (
                      <div className="pt-4 border-t border-white/10 mt-2 space-y-4">
                        <div className="flex items-center gap-2 text-[#00F5FF]">
                          <Database size={12} />
                          <h4 className="text-[10px] font-black uppercase tracking-widest">Mein Journal</h4>
                        </div>

                        {batchInfo && (
                          <div>
                            <p className="text-[8px] text-white/30 uppercase font-black mb-1">Batch / Charge</p>
                            <p className="text-[10px] font-bold text-white/90">{batchInfo}</p>
                          </div>
                        )}

                        {userNotes && (
                          <div>
                            <p className="text-[8px] text-white/30 uppercase font-black mb-1">Persönliche Notizen</p>
                            <p className="text-[10px] font-medium italic text-white/70 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">{userNotes}</p>
                          </div>
                        )}
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
            className={`w-full font-black py-5 rounded-2xl uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 ${hasCollected ? "bg-[#2FF801]/10 text-[#2FF801] border border-[#2FF801]/30" : "bg-white text-black hover:bg-[#00F5FF]"
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
