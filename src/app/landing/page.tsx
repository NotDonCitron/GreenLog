"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Strain } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { normalizeCollectionSource } from "@/lib/strain-display";
import { MarketingStrainCard } from "@/components/landing/marketing-strain-card";
import { FeatureBlock } from "@/components/landing/feature-block";
import { CounterBlock } from "@/components/landing/counter-block";
import { CTAForm } from "@/components/landing/cta-form";
import { ScrollAnimator } from "@/components/landing/scroll-animator";
import { Leaf, Users, Star, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const [strainOfTheDay, setStrainOfTheDay] = useState<Strain | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStrainOfTheDay() {
      try {
        const dayOfYear = Math.floor(
          (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
        );
        const { data: allStrains } = await supabase
          .from("strains")
          .select("*")
          .limit(500);

        if (allStrains && allStrains.length > 0) {
          const strain = allStrains[dayOfYear % allStrains.length];
          setStrainOfTheDay({
            ...strain,
            source: normalizeCollectionSource(strain.source),
          } as Strain);
        }
      } catch (err) {
        console.error("Strain of the day error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStrainOfTheDay();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Ambient neon glow background - same as homepage */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[120%] h-[50%] bg-[#00F5FF]/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[100%] h-[40%] bg-[#2FF801]/4 blur-[100px] rounded-full animate-pulse [animation-delay:2s]" />
      </div>

      {/* HERO SECTION */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-2xl mx-auto">
          {/* Logo / Title */}
          <ScrollAnimator animation="fade-up">
            <h1 className="text-6xl font-black tracking-tighter uppercase leading-none font-display mb-2">
              Green<span className="text-[#00F5FF]">Log</span>
            </h1>
          </ScrollAnimator>

          {/* Tagline */}
          <ScrollAnimator animation="fade-up" delay={100}>
            <p className="text-lg text-[var(--muted-foreground)] mb-8">
              Die professionelle Plattform für Cannabis-Communities
            </p>
          </ScrollAnimator>

          {/* CTA Buttons */}
          <ScrollAnimator animation="fade-up" delay={200}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/login">
                <button className="relative px-8 py-4 h-14 rounded-2xl font-bold uppercase tracking-wide transition-all duration-300 active:scale-[0.98] overflow-hidden group">
                  <div className="absolute inset-0 bg-[#00F5FF]" />
                  <div className="absolute inset-0 bg-[#00F5FF]/80 group-hover:bg-[#00F5FF] transition-colors" />
                  <span className="relative text-black font-display">Jetzt starten</span>
                </button>
              </Link>
              <Link href="#features">
                <button className="relative px-8 py-4 h-14 rounded-2xl font-bold uppercase tracking-wide transition-all duration-300 active:scale-[0.98] overflow-hidden group">
                  <div className="absolute inset-0 bg-transparent" />
                  <div className="absolute inset-0 rounded-2xl border-2 border-[var(--border)] group-hover:border-[#00F5FF]/50 transition-colors" />
                  <span className="relative text-[var(--foreground)] font-display">Mehr erfahren</span>
                </button>
              </Link>
            </div>
          </ScrollAnimator>

          {/* Strain of the Day Card Preview */}
          <ScrollAnimator animation="fade-up" delay={300}>
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
                <p className="text-sm text-[var(--muted-foreground)]">Strain des Tages wird geladen...</p>
              </div>
            ) : strainOfTheDay ? (
              <div className="border-2 border-[var(--border)] rounded-2xl p-6 bg-[var(--background)]/50 backdrop-blur-sm max-w-sm mx-auto">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                  Strain des Tages
                </p>
                <MarketingStrainCard strain={strainOfTheDay} />
              </div>
            ) : (
              <div className="border border-[var(--border)] rounded-2xl p-6 bg-[var(--background)]/30 max-w-sm mx-auto">
                <p className="text-sm text-[var(--muted-foreground)]">Strain des Tages nicht verfügbar</p>
              </div>
            )}
          </ScrollAnimator>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <ScrollAnimator animation="fade-up">
            <h2 className="text-3xl md:text-4xl font-black text-center mb-4 font-display">
              Alles, was du brauchst
            </h2>
          </ScrollAnimator>
          <ScrollAnimator animation="fade-up" delay={100}>
            <p className="text-[var(--muted-foreground)] text-center mb-12 max-w-xl mx-auto">
              GreenLog bietet dir alle Tools für eine professionelle Verwaltung deiner Cannabis-Community.
            </p>
          </ScrollAnimator>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureBlock
              icon={<Leaf size={24} />}
              title="Strain-Verwaltung"
              description="Über 470+ Strains mit detaillierten Infos zu THC, CBD, Genetik und Herkunft. Perfekt für Clubs und Apotheken."
              index={0}
            />
            <FeatureBlock
              icon={<Users size={24} />}
              title="Community & Social"
              description="Folge anderen Usern, teile Strains und entdecke die Community. Bleib auf dem Laufenden mit dem Activity Feed."
              index={1}
            />
            <FeatureBlock
              icon={<Star size={24} />}
              title="Bewertungen & Feedback"
              description="Bewerte Strains mit 1-5 Sternen und schreibe Reviews. Hilf anderen Mitgliedern, die richtigen Sorten zu finden."
              index={2}
            />
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF SECTION */}
      <section className="relative z-10 py-24 px-6 bg-[var(--background)]/50">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            <CounterBlock end={470} suffix="+" label="Strains" index={0} />
            <CounterBlock end={50} suffix="+" label="Clubs & Apotheken" index={1} />
            <CounterBlock end={1200} suffix="+" label="Aktive User" index={2} />
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="relative z-10 py-24 px-6">
        <ScrollAnimator animation="scale">
          <div className="max-w-2xl mx-auto text-center">
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#00F5FF]/5 blur-[100px] rounded-full" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#2FF801]/3 blur-[80px] rounded-full" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-4 font-display">
              Bereit durchzustarten?
            </h2>
            <p className="text-[var(--muted-foreground)] mb-8">
              Fordere jetzt deine persönliche Demo an und überzeuge dich selbst.
            </p>
            <CTAForm />
          </div>
        </ScrollAnimator>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-8 px-6 border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            © 2026 GreenLog. Alle Rechte vorbehalten.
          </p>
          <div className="flex gap-6">
            <Link href="/impressum" className="text-sm text-[var(--muted-foreground)] hover:text-[#00F5FF] transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="text-sm text-[var(--muted-foreground)] hover:text-[#00F5FF] transition-colors">
              Datenschutz
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
