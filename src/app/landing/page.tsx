"use client";

import Head from "next/head";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Strain } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { normalizeCollectionSource } from "@/lib/strain-display";
import { StrainCard } from "@/components/strains/strain-card";
import { FeatureBlock } from "@/components/landing/feature-block";
import { CTAForm } from "@/components/landing/cta-form";
import { ScrollAnimator } from "@/components/landing/scroll-animator";
import { FeedPreview } from "@/components/landing/feed-preview";
import { Leaf, Users, Star, ArrowRight } from "lucide-react";

// Demo data fallback
const DEMO_STRAIN: Strain = {
  id: "demo-1",
  name: "Aurora Ghost Train Haze",
  brand: "Aurora",
  slug: "aurora-ghost-train-haze",
  thc_max: 34,
  type: "sativa",
  terpenes: ["Terpinolene", "Myrcene", "Limonene"],
  flavors: ["Zitrus", "Erdig"],
  effects: ["Energy", "Kreativität", "Fokus"],
  image_url: "/strains/aurora-ghost-train-haze.jpg",
  is_medical: true,
  source: "pharmacy",
};

export default function LandingPage() {
  const [strainOfTheDay, setStrainOfTheDay] = useState<Strain | null>(null);
  const [strainCount, setStrainCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStrainOfTheDay() {
      try {
        const dayOfYear = Math.floor(
          (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
        );
        const { data: allStrains } = await supabase
          .from("strains")
          .select("id")
          .limit(500);

        if (allStrains && allStrains.length > 0) {
          setStrainCount(allStrains.length);
          const strain = allStrains[dayOfYear % allStrains.length];
          // Fetch full strain data for the card
          const { data: fullStrain } = await supabase
            .from("strains")
            .select("*")
            .eq("id", strain.id)
            .single();
          if (fullStrain) {
            setStrainOfTheDay({
              ...fullStrain,
              source: normalizeCollectionSource(fullStrain.source),
            } as Strain);
          }
        } else {
          setStrainOfTheDay(DEMO_STRAIN);
        }
      } catch (err) {
        console.error("Strain of the day error:", err);
        setStrainOfTheDay(DEMO_STRAIN);
      } finally {
        setLoading(false);
      }
    }

    fetchStrainOfTheDay();
  }, []);

  return (
    <>
      <Head>
        <title>CannaLOG – Cannabis Strain Tracking & Collection</title>
        <meta name="description" content="Die Plattform für Clubs, Apotheken und Enthusiasten zur Verwaltung von Cannabis-Sorten. Strain-Datenbank, Community-Features und professionelle Tools." />
        <meta property="og:title" content="CannaLOG – Cannabis Strain Tracking & Collection" />
        <meta property="og:description" content="Die Plattform für Clubs, Apotheken und Enthusiasten zur Verwaltung von Cannabis-Sorten." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://greenlog.app/landing" />
        <meta property="og:image" content="/api/og?title=CannaLOG%20%E2%80%93%20Strain%20Tracking" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="CannaLOG – Cannabis Strain Tracking & Collection" />
        <meta name="twitter:description" content="Die Plattform für Clubs, Apotheken und Enthusiasten zur Verwaltung von Cannabis-Sorten." />
        <meta name="twitter:image" content="/api/og?title=CannaLOG%20%E2%80%93%20Strain%20Tracking" />
        <link rel="canonical" href="https://greenlog.app/landing" />
      </Head>
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/landing" className="font-black italic uppercase tracking-tighter font-display text-xl text-white">
            CannaLOG
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-[var(--muted-foreground)] hover:text-[#00F5FF] transition-colors">
              Features
            </Link>
            <Link href="/strains" className="text-sm text-[var(--muted-foreground)] hover:text-[#00F5FF] transition-colors">
              Strains
            </Link>
            <Link href="/community" className="text-sm text-[var(--muted-foreground)] hover:text-[#00F5FF] transition-colors">
              Community
            </Link>
          </nav>

          {/* CTA Button */}
          <Link href="/login">
            <button className="h-9 px-4 rounded-lg bg-[#00F5FF]/10 border border-[#00F5FF]/30 text-[#00F5FF] text-sm font-bold hover:bg-[#00F5FF]/20 transition-colors">
              Anmelden
            </button>
          </Link>
        </div>
      </header>

      {/* Ambient neon glow background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[120%] h-[50%] bg-[#00F5FF]/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[100%] h-[40%] bg-[#2FF801]/4 blur-[100px] rounded-full animate-pulse [animation-delay:2s]" />
      </div>

      {/* HERO SECTION */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-2xl mx-auto">
          {/* Label */}
          <ScrollAnimator animation="fade-up">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/30 text-white text-sm font-medium mb-6">
              Für Clubs, Apotheken & Enthusiasten
            </span>
          </ScrollAnimator>

          {/* Headline */}
          <ScrollAnimator animation="fade-up" delay={100}>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 font-display">
              Strain-Datenbank für <span className="text-white">Cannabis-Organisationen</span>
            </h1>
          </ScrollAnimator>

          {/* Subheadline */}
          <ScrollAnimator animation="fade-up" delay={200}>
            <p className="text-xl text-[var(--muted-foreground)] mb-10 max-w-2xl mx-auto">
              Verwalte Strains, teile Bewertungen und entdecke neue Sorten.
              Für Clubs und Apotheken.
            </p>
          </ScrollAnimator>

          {/* CTA Buttons */}
          <ScrollAnimator animation="fade-up" delay={300}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/login">
                <button className="inline-flex items-center gap-2 px-8 py-4 h-14 rounded-xl bg-white/10 border border-white/30 text-white font-bold text-lg hover:bg-white/20 transition-all">
                  Jetzt starten
                  <ArrowRight size={20} />
                </button>
              </Link>
              <Link href="/strains">
                <button className="inline-flex items-center gap-2 px-8 py-4 h-14 rounded-xl border-2 border-white/20 text-white font-bold text-lg hover:bg-white/5 transition-all">
                  Strains ansehen
                  <ArrowRight size={20} />
                </button>
              </Link>
            </div>
          </ScrollAnimator>

          {/* Strain of the Day - Same design as app */}
          {!loading && strainOfTheDay && (
            <ScrollAnimator animation="fade-up" delay={400}>
              <div className="max-w-xs mx-auto">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-4">
                  Strain des Tages
                </p>
                <div className="flex items-center justify-center">
                  <StrainCard strain={strainOfTheDay} index={0} />
                </div>
              </div>
            </ScrollAnimator>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="relative">
                <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
                <div className="absolute inset-0 blur-xl bg-[#00F5FF]/30 animate-pulse" />
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">Wird geladen...</p>
            </div>
          )}
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <ScrollAnimator animation="fade-up">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black mb-4 font-display">
                Alles, was du brauchst
              </h2>
              <p className="text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto">
                CannaLog bietet alle Tools für eine professionelle Verwaltung deiner Cannabis-Community.
              </p>
            </div>
          </ScrollAnimator>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureBlock
              icon={<Leaf size={28} />}
              title="Strain-Verwaltung"
              description="Umfassende Strain-Datenbank mit detaillierten Infos zu THC, CBD, Genetik und Herkunft. Perfekt für Clubs und Apotheken."
              index={0}
            />
            <FeatureBlock
              icon={<Users size={28} />}
              title="Community & Social"
              description="Folge anderen Usern, teile Strains und entdecke die Community. Bleib auf dem Laufenden mit dem Activity Feed."
              index={1}
            />
            <FeatureBlock
              icon={<Star size={28} />}
              title="Bewertungen & Feedback"
              description="Bewerte Strains mit 1-5 Sternen und schreibe Reviews. Hilf anderen Mitgliedern, die richtigen Sorten zu finden."
              index={2}
            />
          </div>
        </div>
      </section>

      {/* FEED PREVIEW SECTION */}
      <FeedPreview strainCount={strainCount} />

      {/* WHY CANNALOG SECTION */}
      <section className="relative z-10 py-24 px-6 bg-[var(--background)]/50">
        <div className="max-w-5xl mx-auto">
          <ScrollAnimator animation="fade-up">
            <h2 className="text-3xl md:text-4xl font-black text-center mb-16 font-display">
              Warum CannaLog?
            </h2>
          </ScrollAnimator>
          <div className="grid md:grid-cols-3 gap-8">
            <ScrollAnimator animation="fade-up" delay={0}>
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl bg-[#00F5FF]/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-lg font-bold mb-2">Detaillierte Stats</h3>
                <p className="text-sm text-[var(--muted-foreground)]">THC, CBD, Terpene – alle wichtigen Werte auf einen Blick</p>
              </div>
            </ScrollAnimator>
            <ScrollAnimator animation="fade-up" delay={100}>
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl bg-[#2FF801]/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔍</span>
                </div>
                <h3 className="text-lg font-bold mb-2">Smarter Filter</h3>
                <p className="text-sm text-[var(--muted-foreground)]">Finde schnell die perfekte Sorte für deine Bedürfnisse</p>
              </div>
            </ScrollAnimator>
            <ScrollAnimator animation="fade-up" delay={200}>
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl bg-[#00F5FF]/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💬</span>
                </div>
                <h3 className="text-lg font-bold mb-2">Community</h3>
                <p className="text-sm text-[var(--muted-foreground)]">Teile Bewertungen und entdecke neue Strains</p>
              </div>
            </ScrollAnimator>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="relative z-10 py-24 px-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#00F5FF]/5 blur-[100px] rounded-full" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <ScrollAnimator animation="scale">
            <h2 className="text-3xl md:text-4xl font-black mb-4 font-display">
              Bereit durchzustarten?
            </h2>
          </ScrollAnimator>
          <ScrollAnimator animation="fade-up" delay={100}>
            <p className="text-[var(--muted-foreground)] mb-8 text-lg">
              Starte jetzt mit CannaLog und werde Teil der Community.
            </p>
          </ScrollAnimator>
          <ScrollAnimator animation="fade-up" delay={200}>
            <CTAForm />
          </ScrollAnimator>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-8 px-6 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            © 2026 CannaLog. Alle Rechte vorbehalten.
          </p>
          <div className="flex gap-6">
            <Link href="/impressum" className="text-sm text-[var(--muted-foreground)] hover:text-[#00F5FF] transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="text-sm text-[var(--muted-foreground)] hover:text-[#00F5FF] transition-colors">
              Datenschutz
            </Link>
            <Link href="/agb" className="text-sm text-[var(--muted-foreground)] hover:text-[#00F5FF] transition-colors">
              AGB
            </Link>
          </div>
        </div>
        {/* Jugendschutz & Suchtberatung */}
        <div className="max-w-5xl mx-auto mt-6 pt-6 border-t border-[var(--border)] text-center">
          <p className="text-xs text-[var(--muted-foreground)]">
            <strong>Jugendschutz:</strong> Cannabis und Vermehrungsmaterial müssen vor dem Zugriff Minderjähriger geschützt werden (§ 10 KCanG).
            Diese Plattform richtet sich ausschließlich an volljährige Personen.
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-2">
            Du oder jemand, den du kennst, hat Probleme mit Cannabis?&nbsp;
            <a
              href="https://www.bundesgesundheitsministerium.de/service/iv-beratungsstellensuche"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#00F5FF] transition-colors"
            >
              Beratungsstellen in deiner Nähe finden
            </a>
            &nbsp;— oder kontaktiere die&nbsp;
            <a
              href="https://www.dhs.de/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#00F5FF] transition-colors"
            >
              Deutsche Hauptstelle für Suchtfragen (DHS)
            </a>.
          </p>
        </div>
      </footer>
    </main>
    </>
  );
}
