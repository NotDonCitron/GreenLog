"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Loader2, Sprout, ArrowRight } from "lucide-react";
import { Strain } from "@/lib/types";
import Link from "next/link";
import { normalizeCollectionSource } from "@/lib/strain-display";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { StrainCard } from "@/components/strains/strain-card";
import { AgeGate } from "@/components/age-gate";
import { Card } from "@/components/ui/card";

const DEMO_SIMULATION_DATA: Strain[] = [
  {
    id: "sim-1",
    name: "Aurora Ghost Train Haze",
    brand: "Aurora",
    slug: "aurora-ghost-train-haze",
    thc_max: 34,
    type: "sativa",
    terpenes: ["Terpinolene", "Myrcene", "Limonene"],
    flavors: ["Zitrus", "Erdig"],
    effects: ["Energy", "Kreativität", "Fokus"],
    image_url: "/strains/aurora-typ-1-island-sweet-skunk.jpg",
    is_medical: true,
    source: "pharmacy",
  }
];

const AGE_VERIFIED_KEY = "cannalog_age_verified";

type ActiveGrow = {
  id: string;
  title: string;
  grow_type: string;
  status: string;
  start_date: string;
  strains?: { name: string } | null;
  plant_count?: number;
};

function HomeContent() {
  const { user, isDemoMode } = useAuth();
  const [strainOfTheDay, setStrainOfTheDay] = useState<Strain | null>(null);
  const [activeGrow, setActiveGrow] = useState<ActiveGrow | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch immediately — don't wait for auth
  useEffect(() => {
    let cancelled = false;

    async function fetchHomeData() {
      try {
        if (cancelled) return;

        if (isDemoMode) {
          setStrainOfTheDay(DEMO_SIMULATION_DATA[0]);
          setActiveGrow({ id: "demo-1", title: "Purple Haze Outdoor", grow_type: "outdoor", status: "active", start_date: "2024-03-01", strains: { name: "Purple Haze" }, plant_count: 2 });
          setLoading(false);
          return;
        }

        const dayOfYear = Math.floor(
          (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
          1000 / 60 / 60 / 24
        );

        const { data: allStraains } = await supabase
          .from('strains')
          .select('*')
          .limit(100);

        if (cancelled) return;

        if (allStraains && allStraains.length > 0) {
          setStrainOfTheDay({
            ...allStraains[dayOfYear % allStraains.length],
            source: normalizeCollectionSource(allStraains[dayOfYear % allStraains.length].source),
          });
        } else {
          setStrainOfTheDay(DEMO_SIMULATION_DATA[0]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Home data error:", err);
          setLoading(false);
          setStrainOfTheDay(DEMO_SIMULATION_DATA[0]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchHomeData();
    return () => { cancelled = true; };
  }, [isDemoMode]);

  // Fetch active grow
  useEffect(() => {
    if (!user) return;

    async function fetchActiveGrow() {
      try {
        const { data } = await supabase
          .from("grows")
          .select("*, strains(name)")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (data) {
          const { data: plantCounts } = await supabase
            .from("plants")
            .select("grow_id")
            .eq("grow_id", data.id)
            .in("status", ["seedling", "vegetative", "flowering", "flushing"]);

          setActiveGrow({
            ...data,
            plant_count: plantCounts?.length || 0,
          });
        }
      } catch (err) {
        console.error("Active grow fetch error:", err);
      }
    }

    if (user) {
      void fetchActiveGrow();
    }
  }, [user]);

  // Always show content after brief loading OR if we have demo data
  if (loading && !strainOfTheDay) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <Loader2 className="animate-spin text-[#00F5FF]" size={48} />
          <div className="absolute inset-0 blur-xl bg-[#00F5FF]/30 animate-pulse" />
        </div>
        <p className="text-[11px] font-black text-[var(--muted-foreground)] uppercase tracking-[0.3em] animate-pulse">
          System wird initialisiert...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col py-8">
      {/* Active Grows Quick-Access Widget */}
      {activeGrow && (
        <Link href={`/grows/${activeGrow.id}`} className="block mb-6">
          <Card className="bg-gradient-to-br from-[#2FF801]/10 to-transparent border border-[#2FF801]/30 overflow-hidden group active:scale-[0.98] transition-all">
            <div className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#2FF801]/10 flex items-center justify-center">
                <Sprout size={24} className="text-[#2FF801]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#2FF801] font-black uppercase tracking-widest mb-0.5">Aktives Grow</p>
                <h3 className="font-black text-sm uppercase tracking-tight leading-none text-[var(--foreground)] font-display truncate">
                  {activeGrow.title}
                </h3>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                  {activeGrow.strains?.name || "Unbekannte Sorte"} • Tag {Math.max(1, Math.floor((Date.now() - new Date(activeGrow.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1)}
                </p>
              </div>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#2FF801]/10">
                <ArrowRight size={16} className="text-[#2FF801]" />
              </div>
            </div>
          </Card>
        </Link>
      )}

      {strainOfTheDay && (
        <div className="flex-1 flex items-center justify-center min-h-0 px-2">
          <StrainCard strain={strainOfTheDay} index={0} />
        </div>
      )}

      <div className="pt-6 shrink-0">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/feed">
            <button className="relative w-full h-16 group overflow-hidden rounded-2xl transition-all duration-300 active:scale-[0.98]">
              <div className="absolute inset-0 bg-[#2FF801]/10 transition-all duration-300 group-hover:bg-[#2FF801]/20" />
              <div className="absolute inset-0 rounded-2xl border border-[var(--border)]/50 group-hover:border-[#2FF801]/50 transition-all duration-300" />
              <div className="relative flex items-center justify-center gap-2 h-full">
                <div className="w-8 h-8 rounded-lg bg-[#2FF801]/20 flex items-center justify-center">
                  <span className="text-sm">🔍</span>
                </div>
                <span className="text-[var(--foreground)] text-xs font-bold uppercase tracking-wide font-display">
                  Entdecken
                </span>
              </div>
            </button>
          </Link>
          <Link href="/grows">
            <button className="relative w-full h-16 group overflow-hidden rounded-2xl transition-all duration-300 active:scale-[0.98]">
              <div className="absolute inset-0 bg-[#00F5FF]/10 transition-all duration-300 group-hover:bg-[#00F5FF]/20" />
              <div className="absolute inset-0 rounded-2xl border border-[var(--border)]/50 group-hover:border-[#00F5FF]/50 transition-all duration-300" />
              <div className="relative flex items-center justify-center gap-2 h-full">
                <div className="w-8 h-8 rounded-lg bg-[#00F5FF]/20 flex items-center justify-center">
                  <Sprout size={16} className="text-[#00F5FF]" />
                </div>
                <span className="text-[var(--foreground)] text-xs font-bold uppercase tracking-wide font-display">
                  Grows
                </span>
              </div>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function AgeGateWrapper({ children }: { children: React.ReactNode }) {
  const [ageVerified, setAgeVerified] = useState<boolean | null>(null);

  useEffect(() => {
    // Synchronous read from localStorage - no setTimeout needed
    const stored = localStorage.getItem(AGE_VERIFIED_KEY);
    setAgeVerified(stored === "true");
  }, []);

  if (ageVerified === null) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00F5FF]" size={48} />
      </main>
    );
  }

  if (!ageVerified) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <AgeGate onVerified={() => setAgeVerified(true)} />
      </main>
    );
  }

  return <>{children}</>;
}

export default function Home() {
  return (
    <AgeGateWrapper>
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-24">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[120%] h-[50%] bg-[#00F5FF]/5 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[100%] h-[40%] bg-[#2FF801]/4 blur-[100px] rounded-full animate-pulse [animation-delay:2s]" />
        </div>

        <div className="relative mx-auto w-full px-4 pt-12 flex flex-col h-screen overflow-hidden">
          <header className="flex justify-between items-center shrink-0">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <NotificationBell />
                <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">
                  CannaLog
                </h1>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute inset-0 bg-[#00F5FF]/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-12 h-12 relative rounded-2xl glass-surface border border-[var(--border)]/50 flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-500 overflow-hidden">
                <img
                  src="/logo.png"
                  alt="CannaLog Logo"
                  className="absolute inset-0 w-full h-full object-contain p-1.5"
                />
              </div>
            </div>
          </header>

          <HomeContent />
        </div>
        <BottomNav />
      </main>
    </AgeGateWrapper>
  );
}
