"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { strainKeys } from "@/lib/query-keys";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { ChevronLeft, RefreshCw, Star, Loader2, Heart, CheckCircle2, Upload, Database, Trash2, Pencil, Lock, AlertCircle, Share2 } from "lucide-react";
import { Strain } from "@/lib/types";
import { escapeRegExp } from '@/lib/string-utils';
import { formatPercent, getEffectDisplay, getStrainTheme, getTasteDisplay, normalizeCollectionSource, normalizeTerpeneList } from "@/lib/strain-display";
import { checkAndUnlockBadges } from "@/lib/badges";
import { useCollection } from "@/hooks/useCollection";
import { CreateStrainModal } from "@/components/strains/create-strain-modal";
import { TerpeneRadarChart } from "@/components/strains/terpene-radar-chart";
import { ShareModal } from "@/components/social/share-modal";
import { MatchScoreBadge } from "@/components/strains/match-score-badge";
import { SimilarStrainsSection } from "@/components/strains/SimilarStrainsSection";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

const APP_ADMIN_IDS = process.env.NEXT_PUBLIC_APP_ADMIN_IDS || "";

function isAppAdmin(userId: string): boolean {
  if (!APP_ADMIN_IDS || !userId) return false;
  return APP_ADMIN_IDS.split(",").map(id => id.trim()).filter(Boolean).includes(userId);
}

export default function StrainDetailPageClient() {
  const { slug } = useParams();
  const { user, session, isDemoMode, activeOrganization } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { collectedIds, toggleCollect, collectAction } = useCollection();
  const { error: toastError, success: toastSuccess } = useToast();

  const [strain, setStrain] = useState<Strain & { organization?: { id: string; name: string; slug: string; organization_type: string } } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAdminUploading, setIsAdminUploading] = useState(false);
  const [globalImageRefresh, setGlobalImageRefresh] = useState(0);
  const [isFavorited, setIsFavorite] = useState(false);
  const [hasCollected, setHasCollected] = useState(false);

  // Derive hasCollected from collectedIds - React Query handles updates via useCollection hook
  const isCollected = hasCollected || collectedIds.includes(strain?.id || "");
  const [isDeletable, setIsDeletable] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [batchInfo, setBatchInfo] = useState("");
  const [userNotes, setUserNotes] = useState("");

  const [ratings, setRatings] = useState({
    taste: 4.5,
    effect: 4.5,
    look: 4.5
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStarClick = (key: keyof typeof ratings, value: number) => {
    setRatings(prev => ({
      ...prev,
      [key]: prev[key] === value ? value - 0.5 : value
    }));
  };

  async function fetchStrainDetail() {
    // Try to fetch by slug first, then by id (in case slug is actually an id)
    let { data, error } = await supabase.from("strains").select(`
      *,
      organization:organization_id (
        id,
        name,
        slug,
        organization_type
      )
    `).eq("slug", slug).single();

    // If not found and slug looks like a UUID, try fetching by id
    if (error && !isDemoMode && slug && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug as string)) {
      const { data: idData, error: idError } = await supabase.from("strains").select(`
        *,
        organization:organization_id (
          id,
          name,
          slug,
          organization_type
        )
      `).eq("id", slug).single();

      if (!idError && idData) {
        data = idData;
        error = null;
      }
    }

    if (error && !isDemoMode) {
      throw new Error(error.message);
    }

    let strainData = null;
    let userFav = false;
    let userCollection: { user_image_url: string | null; batch_info: string | null; user_notes: string | null } | null = null;
    let othersCount = 0;
    let isDeletableVal = false;

    if (data) {
      strainData = {
        ...(data as Strain & { organization?: { id: string; name: string; slug: string; organization_type: string } }),
        source: normalizeCollectionSource((data as Strain).source),
      };

      if (user) {
        const { data: fav } = await supabase
          .from("user_strain_relations")
          .select("is_favorite")
          .eq("strain_id", data.id)
          .eq("user_id", user.id)
          .maybeSingle();
        userFav = Boolean(fav?.is_favorite);

        const { data: coll } = await supabase
          .from("user_collection")
          .select("user_image_url, batch_info, user_notes")
          .eq("strain_id", data.id)
          .eq("user_id", user.id)
          .maybeSingle();
        userCollection = coll;

        const { count } = await supabase
          .from("user_collection")
          .select("*", { count: 'exact', head: true })
          .eq("strain_id", data.id)
          .neq("user_id", user.id);
        othersCount = count || 0;
        isDeletableVal = othersCount === 0;
      }
    } else if (isDemoMode) {
      strainData = {
        id: "sim-1",
        name: (slug as string).split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        slug: slug as string,
        type: "hybrid",
        thc_max: 25,
        description: "Simulation Mode: This is a placeholder description for the demo experience.",
        image_url: `/strains/${slug}.jpg`
      };
    }

    return { strain: strainData, isFavorited: userFav, userImageUrl: userCollection?.user_image_url || null, batchInfo: userCollection?.batch_info || "", userNotes: userCollection?.user_notes || "", isDeletable: isDeletableVal };
  }

  const { data: detailData, isLoading, error: detailError, refetch } = useQuery({
    queryKey: strainKeys.detail(slug as string),
    queryFn: fetchStrainDetail,
    enabled: !!slug,
  });

  // Sync state from query data
  useEffect(() => {
    if (detailData?.strain) setStrain(detailData.strain as Strain & { organization?: { id: string; name: string; slug: string; organization_type: string } });
    if (detailData !== undefined) {
      setIsFavorite(detailData.isFavorited);
      setUserImageUrl(detailData.userImageUrl);
      setBatchInfo(detailData.batchInfo);
      setUserNotes(detailData.userNotes);
      setIsDeletable(detailData.isDeletable);
    }
  }, [detailData]);

  const isOrgStrain = Boolean(strain?.organization_id);
  const hasOrgAccess = isOrgStrain && activeOrganization?.organization_id === strain?.organization_id;
  const canViewOrgStrain = isOrgStrain && hasOrgAccess;

  const handleDelete = async () => {
    if (!strain || !user || isDemoMode) return;

    if (strain.created_by !== user.id) {
      toastError("Nur der Ersteller kann diese Sorte löschen.");
      return;
    }

    if (!isDeletable) {
      toastError("Diese Sorte kann nicht mehr gelöscht werden, da sie bereits von anderen Community-Mitgliedern gesammelt wurde.");
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
      toastError(getErrorMessage(error, "Die Sorte konnte nicht gelöscht werden."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !strain) return;

    const isValidMimeType = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type);
    if (!isValidMimeType) {
      toastError("Bitte lade nur JPG, PNG, WEBP oder GIF hoch.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toastError("Das Bild ist zu groß. Maximal 5 MB sind erlaubt.");
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
        user_thc_percent: (strain as any).avg_thc ?? strain.thc_max ?? null,
        user_cbd_percent: (strain as any).avg_cbd ?? strain.cbd_max ?? null,
      }, { onConflict: 'user_id,strain_id' });

      if (collectionError) throw collectionError;

      // React Query will handle UI update via collectedIds from useCollection hook
      // Fire and forget badge check - don't block UI
      checkAndUnlockBadges(user.id, supabase).catch(() => { });
      queryClient.invalidateQueries({ queryKey: ['collection', user.id] });
      toastSuccess("Foto hochgeladen!");
    } catch (error: unknown) {
      toastError("Error: " + getErrorMessage(error, "Foto konnte nicht hochgeladen werden."));
    } finally {
      e.target.value = "";
      setIsUploading(false);
    }
  };

  const handleAdminImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !strain) return;

    const isValidMimeType = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type);
    if (!isValidMimeType) {
      toastError("Bitte lade nur JPG, PNG, WEBP oder GIF hoch.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toastError("Das Bild ist zu groß. Maximal 5 MB sind erlaubt.");
      e.target.value = "";
      return;
    }

    setIsAdminUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const accessToken = session?.access_token;

      if (!accessToken) {
        toastError("Du musst eingeloggt sein.");
        setIsAdminUploading(false);
        return;
      }

      const res = await fetch(`/api/strains/${strain.id}/image`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Upload fehlgeschlagen");
      }

      setGlobalImageRefresh(prev => prev + 1);
      window.location.reload();
      toastSuccess("Globales Strain-Bild erfolgreich aktualisiert!");
    } catch (error: unknown) {
      toastError("Error: " + getErrorMessage(error, "Bild konnte nicht hochgeladen werden."));
    } finally {
      e.target.value = "";
      setIsAdminUploading(false);
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
        is_favorite: nextState,
        is_wishlisted: false
      }, { onConflict: 'user_id,strain_id' });

      if (error) {
        throw error;
      }

      if (nextState) {
        await checkAndUnlockBadges(user.id, supabase);
      }
      queryClient.invalidateQueries({ queryKey: strainKeys.detail(slug as string) });
    } catch (err) {
      console.error("Fav error:", err);
      setIsFavorite(previousState);
      toastError("Favorit konnte nicht gespeichert werden.");
    }
  };

  const saveRating = async () => {
    if (!user || !strain || isDemoMode) return;
    setIsSaving(true);
    try {
      // 1. Save the rating itself
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

      // 2. Invalidate strain detail cache so ratings reflect immediately
      queryClient.invalidateQueries({ queryKey: strainKeys.detail(slug as string) });

      // 3. Close modal immediately after rating success to ensure UI responsiveness
      setShowRatingModal(false);

      // 3. Add to collection using the mutation from useCollection
      // This handles: user_collection upsert, cache invalidation, and badge checks
      await collectAction(strain.id, {
        batchInfo,
        userNotes,
        userImageUrl: userImageUrl || undefined,
        userThc: (strain as any).avg_thc ?? strain.thc_max ?? undefined,
        userCbd: (strain as any).avg_cbd ?? strain.cbd_max ?? undefined
      });

      setHasCollected(true);
      toastSuccess("Eintrag gespeichert", {
        label: "Teilen",
        onClick: () => setShowShareModal(true),
      });

    } catch (error: unknown) {
      console.error("Save rating error:", error);
      toastError("Error: " + getErrorMessage(error, "Bewertung konnte nicht gespeichert werden."));
    } finally {
      setIsSaving(false);
    }
  };

  const { color: themeColor, underlineClass: underlineBg } = getStrainTheme(strain?.type);
  const normalizedTerpenes = normalizeTerpeneList(strain?.terpenes);
  const thcDisplay = formatPercent((strain as any)?.avg_thc ?? strain?.thc_max, '—');
  const cbdDisplay = formatPercent((strain as any)?.avg_cbd ?? strain?.cbd_max, '< 1%');
  const tasteDisplay = strain ? getTasteDisplay(strain, 'Zitrus · Erdig').replace(/, /g, ' · ') : 'Zitrus · Erdig';
  const effectDisplay = strain ? getEffectDisplay(strain) : 'Euphorie';

  const farmerDisplay = strain?.farmer?.trim() || strain?.manufacturer?.trim() || strain?.brand?.trim() || 'Unbekannter Farmer';
  const normalizedStrainName = (() => {
    const rawName = strain?.name?.trim() || '';
    if (!rawName || farmerDisplay === 'Unbekannter Farmer') return rawName;

    const farmerLower = farmerDisplay.toLowerCase();

    // Try stripping the full farmer name (e.g., "420 Pharma: " from "420 Pharma: Natural Gorilla Glue")
    const withoutFarmerPrefix = rawName.replace(
      new RegExp(`^${escapeRegExp(farmerDisplay)}[\s:/-]*`, 'i'),
      ''
    ).trim();

    // Check if remaining text STILL starts with the farmer name (or its first word)
    // This means the farmer name was BOTH at the start of the strain name AND embedded in it
    // e.g., farmer="420 Pharma", name="420 Pharma: 420 Natural Gorilla Glue" -> keep "420 Natural Gorilla Glue"
    const firstWord = farmerDisplay.split(/\s+/)[0].toLowerCase();
    const remainingLower = withoutFarmerPrefix.toLowerCase();

    const stillStartsWithFarmer = remainingLower.startsWith(farmerLower) || remainingLower.startsWith(firstWord);

    if (stillStartsWithFarmer && withoutFarmerPrefix.length > firstWord.length) {
      // Farmer prefix appears BOTH at start and embedded in the remaining strain name.
      // Strip the embedded farmer name from the already-stripped result.
      const strippedEmbedded = withoutFarmerPrefix.replace(new RegExp(`^${escapeRegExp(firstWord)}[\s:/-]+`, 'i'), '').trim();
      if (strippedEmbedded && strippedEmbedded.length > 2) {
        return strippedEmbedded;
      }
    }

    // Prefer the longer result (more of the real strain name preserved)
    if (withoutFarmerPrefix && withoutFarmerPrefix.length < rawName.length - 2) {
      return withoutFarmerPrefix;
    }

    return rawName;
  })();

  if (isLoading) return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00F5FF]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#2FF801]/5 blur-[80px] rounded-full" />
      </div>
      <div className="sticky top-0 z-50 glass-surface border-b border-[var(--border)]/50 px-6 py-4 flex justify-between items-center">
        <div className="w-10 h-10 rounded-full bg-[var(--card)] animate-pulse" />
        <div className="flex gap-2">
          <div className="w-10 h-10 rounded-full bg-[var(--card)] animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-[var(--card)] animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-[var(--card)] animate-pulse" />
        </div>
      </div>
      <div className="px-6 flex flex-col items-center relative z-10">
        <div className="w-full max-w-[340px] aspect-[3/4.5] rounded-[20px] bg-[var(--card)] border border-[var(--border)]/50 animate-pulse mt-4" />
        <div className="w-full max-w-[340px] mt-10">
          <div className="w-full h-16 rounded-2xl bg-[var(--card)] animate-pulse" />
        </div>
      </div>
    </main>
  );
  if (detailError) return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00F5FF]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#2FF801]/5 blur-[80px] rounded-full" />
      </div>
      <div className="sticky top-0 z-50 glass-surface border-b border-[var(--border)]/50 px-6 py-4">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 transition-all">
          <ChevronLeft size={24} className="text-[var(--foreground)]" />
        </button>
      </div>
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-[#ff716c]">
        <AlertCircle size={48} />
        <p className="text-sm font-bold uppercase tracking-widest text-center">
          {detailError instanceof Error ? detailError.message : "Failed to load strain"}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-xl bg-[#ff716c]/10 border border-[#ff716c]/30 text-[#ff716c] text-xs font-bold uppercase tracking-widest hover:bg-[#ff716c]/20 transition-all"
        >
          Retry
        </button>
      </div>
    </main>
  );

  if (!detailData?.strain || !strain) return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00F5FF]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#2FF801]/5 blur-[80px] rounded-full" />
      </div>
      <div className="sticky top-0 z-50 glass-surface border-b border-[var(--border)]/50 px-6 py-4">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 transition-all">
          <ChevronLeft size={24} className="text-[var(--foreground)]" />
        </button>
      </div>
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-[#ff716c]">
        <AlertCircle size={48} />
        <p className="text-sm font-bold uppercase tracking-widest text-center">Strain not found</p>
        <button
          onClick={() => router.push('/strains')}
          className="px-4 py-2 rounded-xl bg-[#ff716c]/10 border border-[#ff716c]/30 text-[#ff716c] text-xs font-bold uppercase tracking-widest hover:bg-[#ff716c]/20 transition-all"
        >
          Back to Strains
        </button>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
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

      <div className="sticky top-0 z-50 glass-surface border-b border-[var(--border)]/50 px-6 py-4 flex justify-between items-center">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 transition-all">
          <ChevronLeft size={24} className="text-[var(--foreground)]" />
        </button>
        <div className="flex gap-2">
          {user && (
            <label className="p-2 rounded-full bg-[#00F5FF]/10 text-[#00F5FF] border border-[#00F5FF]/20 hover:bg-[#00F5FF]/20 transition-all cursor-pointer">
              <Upload size={20} />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          )}
          {user && isAppAdmin(user.id) && (
            <label className="p-2 rounded-full bg-[#2FF801]/10 text-[#2FF801] border border-[#2FF801]/20 hover:bg-[#2FF801]/20 transition-all cursor-pointer" title="Admin: Globales Strain-Bild">
              {isAdminUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
              <input type="file" className="hidden" accept="image/*" onChange={handleAdminImageUpload} disabled={isAdminUploading} />
            </label>
          )}
          <button onClick={toggleFavorite} className={`p-2 rounded-full border transition-all ${isFavorited ? 'bg-red-500/20 border-red-500/40 text-red-500' : 'bg-[var(--card)] border-[var(--border)]/50 text-[var(--muted-foreground)] hover:border-red-500/50'}`}>
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
                  onClick={() => toastError("Diese Sorte kann nicht mehr gelöscht werden, da sie bereits von anderen Community-Mitgliedern gesammelt wurde.")}
                  className="p-2 rounded-full border border-[var(--border)]/50 bg-[var(--card)] text-[#484849]"
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
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--muted-foreground)] truncate">
                  {farmerDisplay}
                </p>
                <p className="title-font italic text-sm font-black leading-tight uppercase text-[var(--foreground)] break-words line-clamp-2 min-h-[2.5rem] flex-1">
                  {normalizedStrainName}
                </p>
              </div>
              <div className="px-5 w-full">
                <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-[var(--border)]/50">
                  <img
                    src={userImageUrl || (strain.image_url ? strain.image_url + (globalImageRefresh ? `?v=${globalImageRefresh}` : '') : "/strains/placeholder-1.svg")}
                    alt={strain.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 border bg-black/70 backdrop-blur-md uppercase text-[9px] px-2 py-1 rounded-sm font-bold" style={{ borderColor: themeColor, color: themeColor }}>{strain.type || 'HYBRID'}</div>
                </div>
              </div>
              {strain.image_attribution && strain.image_attribution.source !== 'none' && (
                <p className="text-xs text-gray-500 mt-1">
                  Foto: {strain.image_attribution?.author} · {strain.image_attribution?.license}
                  {strain.image_attribution?.url && (
                    <> · <a href={strain.image_attribution?.url} target="_blank" rel="noopener noreferrer" className="underline">Quelle</a></>
                  )}
                </p>
              )}
              <div className="px-5 mt-5 w-full mb-5">
                <div className="bg-[var(--card)] border border-[var(--border)]/50 rounded-xl p-4">
                  {/* Row 1: THC & Geschmack */}
                  <div className="grid grid-cols-2 gap-4 border-b border-[var(--border)]/50 pb-2 mb-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted-foreground)] text-[9px] uppercase tracking-widest font-semibold flex-shrink-0 mr-1">THC</span>
                      <span className="text-sm font-bold tracking-wide text-[var(--foreground)]">{thcDisplay}</span>
                    </div>
                    <div className="flex justify-end border-l border-[var(--border)]/50 pl-4 w-full">
                      <span className="text-[var(--muted-foreground)] text-[10px] font-medium tracking-wide truncate">{tasteDisplay}</span>
                    </div>
                  </div>
                  {/* Row 2: CBD & Wirkung */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted-foreground)] text-[9px] uppercase tracking-widest font-semibold flex-shrink-0 mr-1">CBD</span>
                      <span className="text-sm font-bold tracking-wide text-[var(--foreground)]">{cbdDisplay}</span>
                    </div>
                    <div className="flex justify-end border-l border-[var(--border)]/50 pl-4 w-full">
                      <span className="text-[var(--muted-foreground)] text-[10px] font-medium tracking-wide truncate">{effectDisplay}</span>
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
                <h3 className="font-serif italic text-xl font-bold uppercase text-[var(--foreground)]">Sorten Profil</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-black uppercase text-[var(--muted-foreground)] mb-1">Beschreibung</p>
                    <p className="text-[11px] font-medium italic text-[var(--muted-foreground)] leading-relaxed line-clamp-6">{strain.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]/50">
                    <div>
                      <p className="text-[9px] font-black uppercase text-[var(--muted-foreground)] mb-1">Geschmack</p>
                      <p className="text-[10px] font-bold text-[var(--foreground)] truncate">{tasteDisplay}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-[var(--muted-foreground)] mb-1">Wirkung</p>
                      <p className="text-[10px] font-bold text-[var(--foreground)] truncate">{effectDisplay}</p>
                    </div>
                  </div>
                  {normalizedTerpenes.length > 0 && (
                    <div className="pt-4 border-t border-[var(--border)]/50">
                      <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-black uppercase text-[var(--muted-foreground)]">Terpene</p>
                      <button
                        onClick={() => setShowShareModal(true)}
                        className="flex items-center gap-1 text-[9px] text-[var(--muted-foreground)] hover:text-[#00F5FF] transition-colors"
                        title="Chemische Analyse teilen"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Teilen</span>
                      </button>
                    </div>
                      {strain.terpenes && strain.terpenes.length >= 3 ? (
                        <TerpeneRadarChart
                          terpenes={strain.terpenes}
                          themeColor={themeColor}
                          size={180}
                        />
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {normalizedTerpenes.slice(0, 6).map((t, i) => (
                            <span key={i} className="text-[8px] font-bold px-2 py-1 bg-[var(--card)] rounded-md text-[var(--muted-foreground)] border border-[var(--border)]/50">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {(userNotes || batchInfo) && (
                  <div className="pt-4 border-t border-[var(--border)]/50 space-y-4">
                    <div className="flex items-center gap-2 text-[#00F5FF]"><Database size={12} /><h4 className="text-[10px] font-black uppercase">Mein Journal</h4></div>
                    {batchInfo && <p className="text-[10px] font-bold text-[var(--foreground)]">{batchInfo}</p>}
                    {userNotes && <p className="text-[10px] italic text-[var(--muted-foreground)] bg-[var(--card)] p-3 rounded-xl line-clamp-3">{userNotes}</p>}
                  </div>
                )}
              </div>
              <div className="mt-auto flex justify-center items-center gap-2 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">
                <RefreshCw size={12} className="animate-spin-slow" /> Tap to Flip
              </div>
            </Card>
          </div>
        </div>

        <div className="w-full max-w-[340px] mt-4">
          <MatchScoreBadge strainId={strain.id} strainName={strain.name} />
        </div>

        <div className="w-full max-w-[340px] mt-10">
          <button type="button" onClick={() => !isCollected && setShowRatingModal(true)} disabled={isCollected} className={`w-full font-black py-5 rounded-2xl uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${isCollected ? "bg-[#2FF801]/10 text-[#2FF801] border border-[#2FF801]/30" : "bg-gradient-to-r from-[#00F5FF] to-[#00e5ee] text-black hover:opacity-90"}`}>
            {isCollected ? <><CheckCircle2 size={24} /> In Collection</> : "Collect & Rate"}
          </button>
        </div>
      </div>

      {showRatingModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowRatingModal(false)} />
          <Card className="relative w-full max-w-md bg-[var(--card)] border border-[var(--border)]/50 rounded-t-3xl sm:rounded-3xl p-6 pb-12 sm:pb-8 sm:p-8 space-y-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90dvh] overflow-y-auto overscroll-contain">
            <h2 className="text-2xl font-black italic uppercase text-[#00F5FF] text-center font-display">Tasting Log</h2>

            <div className="space-y-6">
              {(['taste', 'effect', 'look'] as const).map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">{key}</span>
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
              <input type="text" placeholder="Batch / Apotheke" className="w-full bg-[var(--input)] border border-[var(--border)]/50 rounded-xl py-3 px-4 text-xs text-[var(--foreground)] placeholder:text-[#484849] outline-none focus:border-[#00F5FF]" value={batchInfo} onChange={(e) => setBatchInfo(e.target.value)} />
              <textarea placeholder="Deine Notizen..." className="w-full bg-[var(--input)] border border-[var(--border)]/50 rounded-xl py-3 px-4 text-xs text-[var(--foreground)] placeholder:text-[#484849] min-h-[100px] outline-none focus:border-[#00F5FF]" value={userNotes} onChange={(e) => setUserNotes(e.target.value)} />
            </div>
            <button type="button" onClick={saveRating} disabled={isSaving} className="w-full h-16 bg-gradient-to-r from-[#00F5FF] to-[#00e5ee] text-black font-black uppercase rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-[#00F5FF]/20 relative z-20">
              {isSaving ? <Loader2 className="animate-spin" /> : "SAVE LOG"}
            </button>
          </Card>
        </div>
      )}
      {!isDemoMode && user && (
        <SimilarStrainsSection strainId={strain.id} strainName={strain.name} />
      )}
      {!showRatingModal && <BottomNav />}
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        strainName={strain.name}
        strainUrl={`/strain/${strain.slug || strain.id}`}
      />
    </main>
  );
}
