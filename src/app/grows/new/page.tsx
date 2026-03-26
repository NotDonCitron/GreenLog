"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Loader2,
  Sprout,
  Calendar,
  ChevronLeft,
  Save,
  Layout,
  Tag
} from "lucide-react";
import Link from "next/link";
import { Strain } from "@/lib/types";

export default function NewGrowPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [strains, setStrains] = useState<Strain[]>([]);
  const [loadingStrains, setLoadingStrains] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [strainId, setStrainId] = useState<string>("");
  const [growType, setGrowType] = useState<string>("indoor");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchStrains() {
      try {
        const { data, error } = await supabase
          .from("strains")
          .select("id, name, slug, type")
          .order("name");

        if (data) setStrains(data as Strain[]);
        if (error) throw error;
      } catch (err) {
        console.error("Error fetching strains:", err);
        setError("Failed to load strains. Please try again.");
      } finally {
        setLoadingStrains(false);
      }
    }

    fetchStrains();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to create a grow.");
      return;
    }

    if (!title) {
      setError("Please give your grow a name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from("grows")
        .insert([
          {
            user_id: user.id,
            strain_id: strainId || null,
            title,
            grow_type: growType,
            start_date: startDate,
            status: "active",
            is_public: true
          }
        ]);

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        router.push("/grows");
        router.refresh();
      }, 1500);
    } catch (err) {
      const error = err as Error;
      console.error("Error creating grow:", error);
      setError(error.message || "Error creating grow.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black pb-32">
      <header className="p-6 sticky top-0 bg-white/90 backdrop-blur-xl z-50 border-b border-black/10">
        <div className="flex items-center gap-4">
          <Link href="/grows">
            <Button variant="ghost" size="icon" className="text-black/60 hover:text-black hover:bg-black/5 rounded-full">
              <ChevronLeft size={24} />
            </Button>
          </Link>
          <div>
            <span className="text-[10px] text-[#00F5FF] font-black uppercase tracking-[0.4em]">Setup</span>
            <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">New Grow</h1>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-md mx-auto">
        <Card className="bg-[#1a191b] border-black/10 p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold uppercase tracking-wider text-center">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-[#00F5FF]/10 border border-[#00F5FF]/20 rounded-xl text-[#00F5FF] text-xs font-bold uppercase tracking-wider text-center">
                Grow created successfully! Redirecting...
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] text-black/40 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Tag size={12} className="text-[#00F5FF]" /> Grow Name
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. My First Grow"
                className="bg-black/5 border-black/10 text-black placeholder:text-black/20 h-12 rounded-xl focus:border-[#00F5FF] transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-black/40 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Sprout size={12} className="text-[#00F5FF]" /> Strain
              </label>
              <Select value={strainId} onValueChange={(val) => setStrainId(val ?? "")}>
                <SelectTrigger className="w-full bg-black/5 border-black/10 text-black h-12 rounded-xl focus:border-[#00F5FF] transition-all">
                  <SelectValue placeholder="Select a strain" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a191b] border-black/10 text-black">
                  {loadingStrains ? (
                    <div className="p-4 flex justify-center">
                      <Loader2 className="animate-spin text-[#00F5FF]" size={20} />
                    </div>
                  ) : (
                    strains.map((strain) => (
                      <SelectItem key={strain.id} value={strain.id}>
                        {strain.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-black/40 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Layout size={12} className="text-[#00F5FF]" /> Grow Type
              </label>
              <Select value={growType} onValueChange={(val) => setGrowType(val ?? "indoor")}>
                <SelectTrigger className="w-full bg-black/5 border-black/10 text-black h-12 rounded-xl focus:border-[#00F5FF] transition-all">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a191b] border-black/10 text-black">
                  <SelectItem value="indoor">Indoor</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="greenhouse">Greenhouse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-black/40 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Calendar size={12} className="text-[#00F5FF]" /> Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-black/5 border-black/10 text-black h-12 rounded-xl focus:border-[#00F5FF] transition-all [color-scheme:dark]"
              />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || success}
                className="w-full bg-[#00F5FF] hover:bg-[#00D5E0] text-black font-black uppercase tracking-widest py-6 rounded-2xl shadow-[0_0_20px_rgba(0,245,255,0.2)] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <Save size={20} /> Save Grow
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <BottomNav />
    </main>
  );
}
