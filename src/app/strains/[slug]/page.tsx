"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { ChevronLeft, RefreshCw, Star, Loader2, Heart, CheckCircle2, Upload, Database, Trash2, Pencil, Lock } from "lucide-react";
import { Strain } from "@/lib/types";
import { CreateStrainModal } from "@/components/strains/create-strain-modal";
import { formatPercent, getEffectDisplay, getStrainTheme, getTasteDisplay, normalizeCollectionSource, normalizeTerpeneList } from "@/lib/strain-display";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export default function StrainDetailPage() {
  const { slug } = useParams();
  const { user, isDemoMode, activeOrganization } = useAuth();
  const router = useRouter();

  const [strain, setStrain] = useState<Strain & { organization?: { id: string; name: string; slug: string; organization_type: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFavorited, setIsFavorite] = useState(false);
  const [hasCollected, setHasCollected] = useState(false);
  const [isDeletable, setIsDeletable] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [batchInfo, setBatchInfo] = useState("");
  const [userNotes, setUserNotes] = useState("");

  const [ratings, setRatings] = useState({
    taste: 4.5,
    effect: 4.5,
    look: 4.5
  });

  const fileInputRef = { current: null as HTMLInputElement | null };

  const handleStarClick = (key: keyof typeof ratings, value: number) => {
    setRatings(prev => ({
      ...prev,
      [key]: prev[key] === value ? value - 0.5 : value
    }));
  };

  useEffect(() => {
    async function fetchStrain() {
      const { data, error } = await supabase.from("strains").select(`
        *,
        organization:organization_id (
          id,
          name,
          slug,
          organization_type
        )
      `).eq("slug", slug).single();

      if (error && !isDemoMode) {
        console.error("Strain fetch error:", error);
      }

      if (data) {
        setStrain({
          ...(data as Strain & { organization?: { id: string; name: string; slug: string; organization_type: string } }),
          source: normalizeCollectionSource((data as Strain).source),
        });

        if (user) {
          const { data: fav } = await supabase
            .from("user_strain_relations")
            .select("is_favorite")
            .eq("strain_id", data.id)
            .eq("user_id", user.id)
            .maybeSingle();
          setIsFavorite(Boolean(fav?.is_favorite));

          const { data: collection } = await supabase
            .from("user_collection")
            .select("user_image_url, batch_info, user_notes")
            .eq("strain_id", data.id)
            .eq("user_id", user.id)
            .maybeSingle();

          setHasCollected(Boolean(collection));
          if (collection) {
            setUserImageUrl(collection.user_image_url || null);
            setBatchInfo(collection.batch_info || "");
            setUserNotes(collection.user_notes || "");
          } else {
            setUserImageUrl(null);
            setBatchInfo("");
            setUserNotes("");
          }

          const { count: othersCount } = await supabase
            .from("user_collection")
            .select("*", { count: 'exact', head: true })
            .eq("strain_id", data.id)
            .neq("user_id", user.id);

          setIsDeletable((othersCount || 0) === 0);
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

  const isOrgStrain = Boolean(strain?.organization_id);
  const hasOrgAccess = isOrgStrain && activeOrganization?.organization_id === strain?.organization_id;
  const canViewOrgStrain = isOrgStrain && hasOrgAccess;

  const handleDelete = async () => {
    if (!strain || !user || isDemoMode) return;

    if (strain.created_by !== user.id) {
      alert("Nur der Ersteller kann diese Sorte löschen.");
      return;
    }

    if (!isDeletable) {
      alert("Diese Sorte kann nicht mehr gelöscht werden, da sie bereits von anderen Community-Mitgliedern gesammelt wurde.");
      return;
    }

    const confirmDelete = window.confirm(`Möchtest du die Sorte "${strain.name}" wirklich unwiderruflich löschen?`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const cleanupOperations = [
        supabase.from("user_strain_relations").delete().eq("strain_id", strain.id).eq("user_id", user.id),
        supabase.from("user_collection").delete().eq("strain_id", strain.id).eq("user_id", user.id),
        supabase.from("ratings").delete().eq("strain_id", strain.id).eq("user_id", user.id),
        supabase.from("user_activities").delete().eq("target_id", String(strain.id)).eq("user_id", user.id),
      ];

      const cleanupResults = await Promise.all(cleanupOperations);
      const cleanupFailure = cleanupResults.find((result) => result.error);
      if (cleanupFailure?.error) {
        throw cleanupFailure.error;
      }

      const { data: deletedRows, error: deleteError } = await supabase
        .from("strains")
        .delete()
        .eq("id", strain.id)
        .eq("created_by", user.id)
        .select("id");

      if (deleteError) {
        throw deleteError;
      }

      if (!deletedRows || deletedRows.length === 0) {
        throw new Error("Löschen fehlgeschlagen: Die Sorte wurde nicht gefunden oder du hast keine Berechtigung.");
      }

      router.replace("/strains");
      router.refresh();
    } catch (error: unknown) {
      console.error("Delete failure:", error);
      alert(getErrorMessage(error, "Die Sorte konnte nicht gelöscht werden."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !strain) return;

    const isValidMimeType = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type);
    if (!isValidMimeType) {
      alert("Bitte lade nur JPG, PNG, WEBP oder GIF hoch.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Das Bild ist zu groß. Maximal 5 MB sind erlaubt.");
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop() || "jpg";
      const fileName = `${user.id}/${strain.slug}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('strains').upload(fileName, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('strains').getPublicUrl(fileName);
      setUserImageUrl(publicUrl);

      const { error: collectionError } = await supabase.from('user_collection').upsert({
        user_id: user.id,
        strain_id: strain.id,
        user_image_url: publicUrl,
        batch_info: batchInfo || null,
        user_notes: userNotes || null,
        user_thc_percent: strain.avg_thc ?? strain.thc_max ?? null,
        user_cbd_percent: strain.avg_cbd ?? strain.cbd_max ?? null,
      }, { onConflict: 'user_id,strain_id' });

      if (collectionError) throw collectionError;

      setHasCollected(true);
      alert("Foto hochgeladen!");
    } catch (error: unknown) {
      alert("Error: " + getErrorMessage(error, "Foto konnte nicht hochgeladen werden."));
    } finally {
      e.target.value = "";
      setIsUploading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!user || !strain || isDemoMode) {
      if (isDemoMode) setIsFavorite(!isFavorited);
      return;
    }

    const previousState = isFavorited;
    const nextState = !previousState;
    setIsFavorite(nextState);

    try {
      const { error } = await supabase.from("user_strain_relations").upsert({
        user_id: user.id,
        strain_id: strain.id,
        is_favorite: nextState
      }, { onConflict: 'user_id,strain_id' });

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error("Fav error:", err);
      setIsFavorite(previousState);
      alert("Favorit konnte nicht gespeichert werden.");
    }
  };

  const saveRating = async () => {
    if (!user || !strain || isDemoMode) return;
    setIsSaving(true);
    try {
      const { error: rError } = await supabase.from("ratings").upsert({
        strain_id: strain.id,
        user_id: user.id,
        overall_rating: (ratings.taste + ratings.effect + ratings.look) / 3,
        taste_rating: ratings.taste,
        effect_rating: ratings.effect,
        look_rating: ratings.look,
        organization_id: isOrgStrain ? strain.organization_id : null,
      }, { onConflict: 'strain_id,user_id' });

      if (rError) throw rError;

      const { error: collectionError } = await supabase.from("user_collection").upsert({
        user_id: user.id,
        strain_id: strain.id,
        batch_info: batchInfo || null,
        user_notes: userNotes || null,
        user_thc_percent: strain.avg_thc ?? strain.thc_max ?? null,
        user_cbd_percent: strain.avg_cbd ?? strain.cbd_max ?? null,
        user_image_url: userImageUrl
      }, { onConflict: 'user_id,strain_id' });

      if (collectionError) throw collectionError;

      setHasCollected(true);
      setShowRatingModal(false);
      router.refresh();
    } catch (error: unknown) {
      alert("Error: " + getErrorMessage(error, "Bewertung konnte nicht gespeichert werden."));
    } finally {
      setIsSaving(false);
    }
  };

  const { color: themeColor, underlineClass: underlineBg } = getStrainTheme(strain?.type);
  const normalizedTerpenes = normalizeTerpeneList(strain?.terpenes);
  const thcDisplay = formatPercent(strain?.avg_thc ?? strain?.thc_max, '—');
  const cbdDisplay = formatPercent(strain?.avg_cbd ?? strain?.cbd_max, '< 1%');
  const tasteDisplay = strain ? getTasteDisplay(strain, 'Zitrus · Erdig').replace(/, /g, ' · ') : 'Zitrus · Erdig';
  const effectDisplay = strain ? getEffectDisplay(strain) : 'Euphorie';

  const farmerDisplay = strain?.farmer?.trim() || strain?.manufacturer?.trim() || strain?.brand?.trim() || 'Unbekannter Farmer';
  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const normalizedStrainName = (() => {
    const rawName = strain?.name?.trim() || '';
    if (!rawName || farmerDisplay === 'Unbekannter Farmer') return rawName;
    const withoutFarmerPrefix = rawName.replace(
      new RegExp(`^${escapeRegExp(farmerDisplay)}[\s:/-]*`, 'i'),
      ''
    ).trim();
    return withoutFarmerPrefix || rawName;
  })();

  if (loading) return <div className="min-h-screen bg-[#0e0e0f] flex items-center justify-center"><Loader2 className="animate-spin text-[#00F5FF]" size={40} /></div>;
  if (!strain) return <div className="min-h-screen bg-[#0e0e0f] text-white text-center py-20 uppercase font-bold">Strain not found</div>;

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white pb-32">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00F5FF]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#2FF801]/5 blur-[80px] rounded-full" />
      </div>

      {isOrgStrain && !canViewOrgStrain && (
        <div className="mx-8 mb-4 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
          <p className="text-sm font-bold text-orange-400">
            Dieser Strain gehört zu {strain.organization?.name} und ist nur für Mitglieder sichtbar.
          </p>
        </div>
      )}

      <div className="sticky top-0 z-50 glass-surface border-b border-[#484849]/50 px-6 py-4 flex justify-between items-center">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-[#1a191b] border border-[#484849]/50 hover:border-[#00F5FF]/50 transition-all">
          <ChevronLeft size={24} className="text-white" />
        </button>
        <div className="flex gap-2">
          {user && (
            <label className="p-2 rounded-full bg-[#00F5FF]/10 text-[#00F5FF] border border-[#00F5FF]/20 hover:bg-[#00F5FF]/20 transition-all cursor-pointer">
              <Upload size={20} />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          )}
          <button onClick={toggleFavorite} className={`p-2 rounded-full border transition-all ${isFavorited ? 'bg-red-500/20 border-red-500/40 text-red-500' : 'bg-[#1a191b] border-[#484849]/50 text-[#adaaab] hover:border-red-500/50'}`}>
            <Heart size={20} fill={isFavorited ? "currentColor" : "none"} />
          </button>
          {user && strain?.created_by === user.id && (
            <>
              <CreateStrainModal
                strain={strain}
                onSuccess={() => window.location.reload()}
                trigger={
                  <button className="p-2 rounded-full border border-[#00F5FF]/20 bg-[#00F5FF]/10 text-[#00F5FF] hover:bg-[#00F5FF]/20 transition-all">
                    <Pencil size={20} />
                  </button>
                }
              />
              {isDeletable ? (
                <button onClick={handleDelete} disabled={isDeleting} className="p-2 rounded-full border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all">
                  {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                </button>
              ) : (
                <button
                  onClick={() => alert("Diese Sorte kann nicht mehr gelöscht werden, da sie bereits von anderen Community-Mitgliedern gesammelt wurde.")}
                  className="p-2 rounded-full border border-[#484849]/50 bg-[#1a191b] text-[#484849]"
                >
                  <Lock size={20} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="px-6 flex flex-col items-center relative z-10">
        <div className="relative w-full max-w-[340px] aspect-[3/4.5] perspective-1000 mt-4 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>

            {/* FRONT SIDE */}
            <Card
              className="absolute inset-0 backface-hidden rounded-[20px] overflow-hidden bg-[#121212] shadow-2xl flex flex-col border-2"
              style={{ borderColor: themeColor, boxShadow: `0 0 15px ${themeColor}4d` }}
            >
              <div className="p-3.5 pb-2">
                <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#adaaab] truncate">
                  {farmerDisplay}
                </h2>
                <p className="mt-1 title-font italic text-sm font-black leading-tight uppercase text-white break-words line-clamp-2 min-h-[2.5rem]">
                  {normalizedStrainName}
                </p>
              </div>
              <div className="px-5 w-full">
                <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-[#484849]/50">
                  <img src={userImageUrl || strain.image_url || "/strains/placeholder-1.svg"} alt={strain.name} className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 left-2 border bg-black/70 backdrop-blur-md uppercase text-[9px] px-2 py-1 rounded-sm font-bold" style={{ borderColor: themeColor, color: themeColor }}>{strain.type || 'HYBRID'}</div>
                </div>
              </div>
              <div className="px-5 mt-5 w-full mb-5">
                <div className="bg-[#1a191b] border border-[#484849]/50 rounded-xl p-4">
                  {/* Row 1: THC & Geschmack */}
                  <div className="grid grid-cols-2 gap-4 border-b border-[#484849]/50 pb-2 mb-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[#adaaab] text-[9px] uppercase tracking-widest font-semibold flex-shrink-0 mr-1">THC</span>
                      <span className="text-sm font-bold tracking-wide text-white">{thcDisplay}</span>
                    </div>
                    <div className="flex justify-end border-l border-[#484849]/50 pl-4 w-full">
                      <span className="text-[#adaaab] text-[10px] font-medium tracking-wide truncate">{tasteDisplay}</span>
                    </div>
                  </div>
                  {/* Row 2: CBD & Wirkung */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[#adaaab] text-[9px] uppercase tracking-widest font-semibold flex-shrink-0 mr-1">CBD</span>
                      <span className="text-sm font-bold tracking-wide text-white">{cbdDisplay}</span>
                    </div>
                    <div className="flex justify-end border-l border-[#484849]/50 pl-4 w-full">
                      <span className="text-[#adaaab] text-[10px] font-medium tracking-wide truncate">{effectDisplay}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* BACK SIDE */}
            <Card
              className="absolute inset-0 rotate-y-180 backface-hidden rounded-[20px] overflow-hidden bg-[#121212] shadow-2xl p-8 flex flex-col border-2"
              style={{ borderColor: themeColor }}
            >
              <div className="flex-1 space-y-6">
                <h3 className="font-serif italic text-xl font-bold uppercase text-white">Sorten Profil</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-black uppercase text-[#adaaab] mb-1">Beschreibung</p>
                    <p className="text-[11px] font-medium italic text-[#adaaab] leading-relaxed line-clamp-6">{strain.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#484849]/50">
                    <div>
                      <p className="text-[9px] font-black uppercase text-[#adaaab] mb-1">Geschmack</p>
                      <p className="text-[10px] font-bold text-white truncate">{tasteDisplay}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-[#adaaab] mb-1">Wirkung</p>
                      <p className="text-[10px] font-bold text-white truncate">{effectDisplay}</p>
                    </div>
                  </div>
                  {normalizedTerpenes.length > 0 && (
                    <div className="pt-4 border-t border-[#484849]/50">
                      <p className="text-[9px] font-black uppercase text-[#adaaab] mb-2">Terpene</p>
                      <div className="flex flex-wrap gap-1.5">
                        {normalizedTerpenes.slice(0, 6).map((t, i) => (
                          <span key={i} className="text-[8px] font-bold px-2 py-1 bg-[#1a191b] rounded-md text-[#adaaab] border border-[#484849]/50">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {(userNotes || batchInfo) && (
                  <div className="pt-4 border-t border-[#484849]/50 space-y-4">
                    <div className="flex items-center gap-2 text-[#00F5FF]"><Database size={12} /><h4 className="text-[10px] font-black uppercase">Mein Journal</h4></div>
                    {batchInfo && <p className="text-[10px] font-bold text-white">{batchInfo}</p>}
                    {userNotes && <p className="text-[10px] italic text-[#adaaab] bg-[#1a191b] p-3 rounded-xl line-clamp-3">{userNotes}</p>}
                  </div>
                )}
              </div>
              <div className="mt-auto flex justify-center items-center gap-2 text-[10px] font-bold text-[#adaaab] uppercase tracking-widest">
                <RefreshCw size={12} className="animate-spin-slow" /> Tap to Flip
              </div>
            </Card>
          </div>
        </div>

        <div className="w-full max-w-[340px] mt-10">
          <button onClick={() => !hasCollected && setShowRatingModal(true)} disabled={hasCollected} className={`w-full font-black py-5 rounded-2xl uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${hasCollected ? "bg-[#2FF801]/10 text-[#2FF801] border border-[#2FF801]/30" : "bg-gradient-to-r from-[#00F5FF] to-[#00e5ee] text-black hover:opacity-90"}`}>
            {hasCollected ? <><CheckCircle2 size={24} /> In Collection</> : "Collect & Rate"}
          </button>
        </div>
      </div>

      {showRatingModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowRatingModal(false)} />
          <Card className="relative w-full max-w-md bg-[#1a191b] border border-[#484849]/50 rounded-t-3xl sm:rounded-3xl p-8 space-y-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <h2 className="text-2xl font-black italic uppercase text-[#00F5FF] text-center font-display">Tasting Log</h2>

            <div className="space-y-6">
              {(['taste', 'effect', 'look'] as const).map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#adaaab]">{key}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleStarClick(key, star)}
                        className="transition-transform active:scale-90"
                      >
                        <Star
                          size={24}
                          className={ratings[key] >= star ? "text-[#ffd700] fill-[#ffd700]" : "text-[#484849]"}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <input type="text" placeholder="Batch / Apotheke" className="w-full bg-[#131314] border border-[#484849]/50 rounded-xl py-3 px-4 text-xs text-white placeholder:text-[#484849] outline-none focus:border-[#00F5FF]" value={batchInfo} onChange={(e) => setBatchInfo(e.target.value)} />
              <textarea placeholder="Deine Notizen..." className="w-full bg-[#131314] border border-[#484849]/50 rounded-xl py-3 px-4 text-xs text-white placeholder:text-[#484849] min-h-[100px] outline-none focus:border-[#00F5FF]" value={userNotes} onChange={(e) => setUserNotes(e.target.value)} />
            </div>
            <button onClick={saveRating} disabled={isSaving} className="w-full h-16 bg-gradient-to-r from-[#00F5FF] to-[#00e5ee] text-black font-black uppercase rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-[#00F5FF]/20">
              {isSaving ? <Loader2 className="animate-spin" /> : "SAVE LOG"}
            </button>
          </Card>
        </div>
      )}
      <BottomNav />
    </main>
  );
}
