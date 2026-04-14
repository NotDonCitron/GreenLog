"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
  Tag,
  Eye,
  EyeOff
} from "lucide-react";
import Link from "next/link";
import { Strain } from "@/lib/types";
import { checkAndUnlockBadges } from "@/lib/badges";
import { createGrow } from "@/lib/grows/actions";

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
  const [isPublic, setIsPublic] = useState(true);

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
      // Use server action to create grow
      const result = await createGrow({
        title,
        strain_id: strainId || null,
        grow_type: growType,
        start_date: startDate,
        is_public: isPublic
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create grow');
      }

      await checkAndUnlockBadges(user.id, supabase);
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
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-32">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
      </div>

      <header className="sticky top-0 z-50 glass-surface border-b border-[var(--border)]/50 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/grows">
            <Button variant="ghost" size="icon" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] rounded-full transition-all">
              <ChevronLeft size={24} />
            </Button>
          </Link>
          <div>
            <span className="text-[10px] text-[#00F5FF] font-black uppercase tracking-[0.4em]">Setup</span>
            <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">New Grow</h1>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-md mx-auto relative z-10">
        <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-[#ff716c]/10 border border-[#ff716c]/20 rounded-xl text-[#ff716c] text-xs font-bold uppercase tracking-wider text-center">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-[#00F5FF]/10 border border-[#00F5FF]/20 rounded-xl text-[#00F5FF] text-xs font-bold uppercase tracking-wider text-center">
                Grow created successfully! Redirecting...
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] text-[var(--muted-foreground)] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Tag size={12} className="text-[#00F5FF]" /> Grow Name
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. My First Grow"
                className="bg-[var(--input)] border border-[var(--border)]/50 text-[var(--foreground)] placeholder:text-[#484849] h-12 rounded-xl focus:border-[#00F5FF] transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-[var(--muted-foreground)] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Sprout size={12} className="text-[#00F5FF]" /> Strain
              </label>
              <Select value={strainId} onValueChange={(val) => setStrainId(val ?? "")}>
                <SelectTrigger className="w-full bg-[var(--input)] border border-[var(--border)]/50 text-[var(--foreground)] h-12 rounded-xl focus:border-[#00F5FF] transition-all">
                  <SelectValue placeholder="Select a strain" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--card)] border border-[var(--border)]/50 text-[var(--foreground)]">
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
              <label className="text-[10px] text-[var(--muted-foreground)] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Layout size={12} className="text-[#00F5FF]" /> Grow Type
              </label>
              <Select value={growType} onValueChange={(val) => setGrowType(val ?? "indoor")}>
                <SelectTrigger className="w-full bg-[var(--input)] border border-[var(--border)]/50 text-[var(--foreground)] h-12 rounded-xl focus:border-[#00F5FF] transition-all">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--card)] border border-[var(--border)]/50 text-[var(--foreground)]">
                  <SelectItem value="indoor">Indoor</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="greenhouse">Greenhouse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-[var(--muted-foreground)] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Calendar size={12} className="text-[#00F5FF]" /> Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[var(--input)] border border-[var(--border)]/50 text-[var(--foreground)] h-12 rounded-xl focus:border-[#00F5FF] transition-all [color-scheme:dark]"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-[var(--muted)] border border-[var(--border)]/50 rounded-xl">
              <div className="flex items-center gap-2">
                {isPublic ? <Eye size={14} className="text-[#2FF801]" /> : <EyeOff size={14} className="text-[var(--muted-foreground)]" />}
                <div>
                  <p className="text-xs font-bold text-[var(--foreground)]">Öffentlich sichtbar</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Andere können dieses Grow sehen</p>
                </div>
              </div>
              <Switch checked={isPublic} onCheckedChange={(checked) => setIsPublic(checked)} />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || success}
                className="w-full bg-gradient-to-r from-[#00F5FF] to-[#00e5ee] hover:opacity-90 text-black font-black uppercase tracking-widest py-6 rounded-2xl shadow-lg shadow-[#00F5FF]/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
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
