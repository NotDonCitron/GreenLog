"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Info, RefreshCw, Star, Loader2, Heart, Share2, CheckCircle2, Camera, Upload, Download } from "lucide-react";
import { toPng } from 'html-to-image';

export default function StrainDetailPage() {
  const { slug } = useParams();
  const { user, isDemoMode } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hiddenCardRef = useRef<HTMLDivElement>(null);
  
  const [strain, setStrain] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasCollected, setHasCollected] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    async function fetchStrain() {
      if (isDemoMode) {
        setStrain({ id: "sim-1", name: "Godfather OG", slug: "godfather-og", type: "indica", thc_max: 34, description: "Simulation Mode", image_url: "https://loremflickr.com/600/800/cannabis,bud?lock=1" });
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

  // IMAGE EXPORT FUNCTION
  const handleExportImage = async () => {
    if (!hiddenCardRef.current || !strain) return;
    
    setIsExporting(true);
    try {
      // Use the hidden clean card for export to avoid 3D transform issues and clipping
      const dataUrl = await toPng(hiddenCardRef.current, {
        cacheBust: true,
        pixelRatio: 3, // Even higher resolution for sharing
        backgroundColor: '#0e0e0f',
      });
      
      const link = document.createElement('a');
      link.download = `greenlog-${strain.slug}-card.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // IMAGE UPLOAD FUNCTION
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !strain) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${strain.slug}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload in Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('strains')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Generate Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('strains')
        .getPublicUrl(filePath);

      // 3. Update Database Entry
      const { error: updateError } = await supabase
        .from('strains')
        .update({ image_url: publicUrl })
        .eq('id', strain.id);

      if (updateError) throw updateError;

      // Update UI
      setStrain({ ...strain, image_url: publicUrl });
      alert("Image updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Upload error: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0e0e0f] flex items-center justify-center"><Loader2 className="animate-spin text-[#00F5FF]" size={40} /></div>;
  if (!strain) return <div className="text-white text-center py-20 uppercase tracking-widest font-bold">Strain not found</div>;

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white pb-32">
      {/* HIDDEN CLEAN CARD FOR EXPORT */}
      <div 
        ref={hiddenCardRef}
        className="absolute left-[-9999px] top-0 p-20 bg-[#0e0e0f]"
        style={{ width: '500px' }}
      >
        <div className="relative w-full aspect-[3/4.5]">
          <Card className="absolute inset-0 overflow-hidden border-2 rounded-[2.5rem] bg-[#1a191b] border-[#00F5FF] shadow-[0_0_50px_rgba(0,245,255,0.2)]">
            <div className="h-3/5 relative">
              <img src={strain.image_url} alt={strain.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a191b] via-transparent to-transparent" />
            </div>
            <div className="p-10 flex flex-col h-2/5 justify-between">
              <div>
                <Badge className="bg-[#2FF801]/10 text-[#2FF801] border-none px-3 py-1 text-xs font-bold uppercase mb-4">{strain.type}</Badge>
                <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">{strain.name}</h1>
              </div>
              <div className="text-xs font-bold text-white/20 tracking-widest uppercase">
                GreenLog Collection
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="p-6 flex justify-between items-center sticky top-0 z-50 bg-[#0e0e0f]/80 backdrop-blur-xl">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-white/5"><ChevronLeft size={24} /></button>
        <div className="flex gap-2">
          {/* Admin Upload Button (Visible when logged in) */}
          {user && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-2 rounded-full bg-[#00F5FF]/10 text-[#00F5FF] border border-[#00F5FF]/20"
            >
              {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
            </button>
          )}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          <button className="p-2 rounded-full bg-white/5 text-red-500"><Heart size={20} /></button>
        </div>
      </div>

      <div className="px-6 flex flex-col items-center">
        <div className="relative w-full max-w-[340px] aspect-[3/4.5] perspective-1000 mt-4 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <div ref={cardRef} className={`relative w-full h-full transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            {/* Front Card */}
            <Card className="absolute inset-0 backface-hidden overflow-hidden border-2 rounded-[2.5rem] bg-[#1a191b] border-[#00F5FF] ring-8 ring-[#00F5FF]/10">
              <div className="h-3/5 relative">
                <img src={strain.image_url} alt={strain.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a191b] via-transparent to-transparent" />
                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Uploading...</p>
                  </div>
                )}
              </div>
              <div className="p-8 flex flex-col h-2/5 justify-between">
                <div>
                  <Badge className="bg-[#2FF801]/10 text-[#2FF801] border-none px-3 py-1 text-[10px] font-bold uppercase mb-2">{strain.type}</Badge>
                  <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">{strain.name}</h1>
                </div>
                <div className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Tap to Flip</div>
              </div>
            </Card>
            {/* Back Card */}
            <Card className="absolute inset-0 rotate-y-180 backface-hidden overflow-hidden border-2 rounded-[2.5rem] bg-[#1a191b] border-[#2FF801] ring-8 ring-[#2FF801]/10">
              <div className="p-8 h-full flex flex-col justify-center text-center">
                <h3 className="text-[#2FF801] font-black uppercase tracking-widest mb-4">Strain Info</h3>
                <p className="text-sm italic text-white/60">Images for this strain can be updated using the upload icon above.</p>
              </div>
            </Card>
          </div>
        </div>

        <div className="w-full max-w-[340px] mt-10 space-y-4">
          <button disabled={hasCollected} className={`w-full font-black py-5 rounded-2xl uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 ${hasCollected ? "bg-[#2FF801]/10 text-[#2FF801]" : "bg-white text-black"}`}>
            {hasCollected ? <><CheckCircle2 size={24} /> In Collection</> : "Collect & Rate"}
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleExportImage();
            }}
            disabled={isExporting}
            className="w-full py-4 rounded-2xl border border-white/10 bg-white/5 text-white/60 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
          >
            {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            {isExporting ? "Exporting..." : "Download as Image"}
          </button>
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
