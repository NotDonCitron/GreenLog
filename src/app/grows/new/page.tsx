"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Loader2, 
  Sprout, 
  Calendar, 
  ChevronLeft, 
  Save, 
  AlertCircle,
  Tag,
  Wind,
  Droplets
} from "lucide-react";
import Link from "next/link";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface Strain {
  id: string;
  name: string;
}

export default function NewGrowPage() {
  const { user, isDemoMode, loading: authLoading } = useAuth();
  const router = useRouter();

  const [strains, setStrains] = useState<Strain[]>([]);
  const [fetchingStrains, setFetchingStrains] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [strainId, setStrainId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [growType, setGrowType] = useState("indoor");
  const [medium, setMedium] = useState("soil");

  useEffect(() => {
    async function fetchStrains() {
      try {
        const { data, error: fetchError } = await supabase
          .from("strains")
          .select("id, name")
          .order("name");

        if (data) setStrains(data as Strain[]);
        if (fetchError) console.error("Error fetching strains:", fetchError);
      } catch (err) {
        console.error("Fetch strains error:", err);
      } finally {
        setFetchingStrains(false);
      }
    }

    fetchStrains();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user && !isDemoMode) {
      setError("Du musst eingeloggt sein, um einen Grow zu starten.");
      return;
    }

    if (!title) {
      setError("Bitte gib einen Namen für deinen Grow ein.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isDemoMode) {
        // Simulate DB delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("Demo Mode: Grow simulated created", { title, strainId, startDate, growType, medium });
        router.push("/grows");
      } else if (user) {
        const { error: insertError } = await supabase
          .from("grows")
          .insert([
            {
              user_id: user.id,
              strain_id: strainId || null,
              title,
              grow_type: growType,
              medium,
              start_date: startDate,
              status: "active",
              is_public: true
            }
          ]);

        if (insertError) throw insertError;
        
        router.push("/grows");
      }
    } catch (err: unknown) {
      console.error("Error creating grow:", err);
      const errorMessage = err instanceof Error ? err.message : "Fehler beim Erstellen des Grows.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="min-h-screen bg-[#0e0e0f] flex items-center justify-center"><Loader2 className="animate-spin text-[#00F5FF]" size={40} /></div>;

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white pb-32">
      <header className="p-8 sticky top-0 bg-[#0e0e0f]/90 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/grows" className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <div>
            <span className="text-[10px] text-[#00F5FF] font-black uppercase tracking-[0.4em]">Initialize</span>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Neuer Grow</h1>
          </div>
        </div>
      </header>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Card className="p-4 bg-red-500/10 border-red-500/20 flex items-start gap-3 text-red-500 text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <p>{error}</p>
            </Card>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <Sprout size={12} className="text-[#00F5FF]" /> Grow Bezeichnung
            </label>
            <Input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Erster Indoor Run 2024"
              className="bg-white/5 border-white/10 h-14 text-lg focus:border-[#00F5FF]/50 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <Tag size={12} className="text-[#00F5FF]" /> Sorte auswählen
            </label>
            <Select value={strainId} onValueChange={setStrainId}>
              <SelectTrigger className="bg-white/5 border-white/10 h-14 w-full justify-between text-left px-4">
                <SelectValue placeholder={fetchingStrains ? "Lade Sorten..." : "Sorte wählen (Optional)"} />
              </SelectTrigger>
              <SelectContent className="bg-[#1a191b] border-white/10 text-white max-h-[300px]">
                <SelectItem value="">Keine Sorte gewählt</SelectItem>
                {strains.map((strain) => (
                  <SelectItem key={strain.id} value={strain.id}>
                    {strain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <Calendar size={12} className="text-[#00F5FF]" /> Startdatum
              </label>
              <Input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white/5 border-white/10 h-14 focus:border-[#00F5FF]/50 transition-all [color-scheme:dark]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <Wind size={12} className="text-[#00F5FF]" /> Umgebung
              </label>
              <Select value={growType} onValueChange={setGrowType}>
                <SelectTrigger className="bg-white/5 border-white/10 h-14 w-full justify-between px-4">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a191b] border-white/10 text-white">
                  <SelectItem value="indoor">Indoor</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="greenhouse">Gewächshaus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <Droplets size={12} className="text-[#00F5FF]" /> Medium
            </label>
            <Select value={medium} onValueChange={setMedium}>
              <SelectTrigger className="bg-white/5 border-white/10 h-14 w-full justify-between px-4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a191b] border-white/10 text-white">
                <SelectItem value="soil">Erde (Soil)</SelectItem>
                <SelectItem value="coco">Kokos (Coco)</SelectItem>
                <SelectItem value="hydro">Hydroponik</SelectItem>
                <SelectItem value="aero">Aeroponik</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-6">
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-16 bg-[#00F5FF] text-black font-black hover:bg-[#00D5E0] transition-all rounded-2xl shadow-[0_0_20px_rgba(0,245,255,0.2)] flex items-center justify-center gap-3 text-sm tracking-[0.2em] uppercase"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  <Save size={20} /> Grow Initialisieren
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-[8px] text-white/20 uppercase tracking-[0.4em] font-mono">
            Protocol: Grow_Tracker_v1.0.4 // User: {user?.email || "Guest"}
          </p>
        </form>
      </div>

      <BottomNav />
    </main>
  );
}
