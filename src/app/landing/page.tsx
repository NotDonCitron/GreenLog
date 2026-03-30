"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Strain } from "@/lib/types";
import { Loader2, Menu, X } from "lucide-react";
import { normalizeCollectionSource } from "@/lib/strain-display";
import { MarketingStrainCard } from "@/components/landing/marketing-strain-card";
import { FeatureBlock } from "@/components/landing/feature-block";
import { CTAForm } from "@/components/landing/cta-form";
import { ScrollAnimator } from "@/components/landing/scroll-animator";
import { Leaf, Users, Star, ArrowRight } from "lucide-react";

// Demo data fallback when Supabase is not available
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
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <main className="min-h-screen bg-white text-gray-900">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/landing" className="font-black uppercase tracking-tighter font-display text-xl">
            Green<span className="text-green-600">Log</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-gray-600 hover:text-green-600 transition-colors">
              Features
            </Link>
            <Link href="/strains" className="text-sm text-gray-600 hover:text-green-600 transition-colors">
              Strains
            </Link>
            <Link href="/community" className="text-sm text-gray-600 hover:text-green-600 transition-colors">
              Community
            </Link>
          </nav>

          {/* CTA Button */}
          <Link href="/login" className="hidden md:inline-flex">
            <button className="h-9 px-4 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors">
              Anmelden
            </button>
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-900"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="flex flex-col p-4 gap-4">
              <Link
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm text-gray-600 hover:text-green-600 transition-colors py-2"
              >
                Features
              </Link>
              <Link
                href="/strains"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm text-gray-600 hover:text-green-600 transition-colors py-2"
              >
                Strains
              </Link>
              <Link
                href="/community"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm text-gray-600 hover:text-green-600 transition-colors py-2"
              >
                Community
              </Link>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <button className="h-9 px-4 rounded-lg bg-green-600 text-white text-sm font-bold w-full">
                  Anmelden
                </button>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            {/* Label */}
            <ScrollAnimator animation="fade-up">
              <span className="inline-block px-4 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-6">
                Für Clubs, Apotheken & Enthusiasten
              </span>
            </ScrollAnimator>

            {/* Headline */}
            <ScrollAnimator animation="fade-up" delay={100}>
              <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6">
                Deine Plattform für
                <span className="text-green-600"> Cannabis</span>
              </h1>
            </ScrollAnimator>

            {/* Subheadline */}
            <ScrollAnimator animation="fade-up" delay={200}>
              <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                Verwalte Strains, teile Bewertungen und entdecke neue Sorten.
                GreenLog macht es einfach.
              </p>
            </ScrollAnimator>

            {/* CTA Buttons */}
            <ScrollAnimator animation="fade-up" delay={300}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <Link href="/login">
                  <button className="inline-flex items-center gap-2 px-8 py-4 h-14 rounded-xl bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20">
                    Jetzt starten
                    <ArrowRight size={20} />
                  </button>
                </Link>
                <Link href="#features">
                  <button className="inline-flex items-center gap-2 px-8 py-4 h-14 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-lg hover:border-gray-400 hover:bg-gray-50 transition-colors">
                    Mehr erfahren
                  </button>
                </Link>
              </div>
            </ScrollAnimator>

            {/* Strain of the Day Card Preview */}
            {!loading && strainOfTheDay && (
              <ScrollAnimator animation="fade-up" delay={400}>
                <div className="max-w-sm mx-auto">
                  <p className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">
                    Strain des Tages
                  </p>
                  <MarketingStrainCard strain={strainOfTheDay} />
                </div>
              </ScrollAnimator>
            )}

            {loading && (
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="animate-spin text-green-600" size={32} />
                <p className="text-sm text-gray-500">Wird geladen...</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <ScrollAnimator animation="fade-up">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black mb-4">
                Alles, was du brauchst
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                GreenLog bietet alle Tools für eine professionelle Verwaltung deiner Cannabis-Community.
              </p>
            </div>
          </ScrollAnimator>

          <div className="grid md:grid-cols-3 gap-8">
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

      {/* WHY GREENLOG SECTION */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <ScrollAnimator animation="fade-up">
            <h2 className="text-3xl md:text-4xl font-black text-center mb-16">
              Warum GreenLog?
            </h2>
          </ScrollAnimator>
          <div className="grid md:grid-cols-3 gap-8">
            <ScrollAnimator animation="fade-up" delay={0}>
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-lg font-bold mb-2">Detaillierte Stats</h3>
                <p className="text-gray-600">THC, CBD, Terpene – alle wichtigen Werte auf einen Blick</p>
              </div>
            </ScrollAnimator>
            <ScrollAnimator animation="fade-up" delay={100}>
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔍</span>
                </div>
                <h3 className="text-lg font-bold mb-2">Smarter Filter</h3>
                <p className="text-gray-600">Finde schnell die perfekte Sorte für deine Bedürfnisse</p>
              </div>
            </ScrollAnimator>
            <ScrollAnimator animation="fade-up" delay={200}>
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💬</span>
                </div>
                <h3 className="text-lg font-bold mb-2">Community</h3>
                <p className="text-gray-600">Teile Bewertungen und entdecke neue Strains</p>
              </div>
            </ScrollAnimator>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24 px-6 bg-green-600">
        <div className="max-w-2xl mx-auto text-center">
          <ScrollAnimator animation="scale">
            <h2 className="text-3xl md:text-4xl font-black mb-4 text-white">
              Bereit durchzustarten?
            </h2>
          </ScrollAnimator>
          <ScrollAnimator animation="fade-up" delay={100}>
            <p className="text-green-100 mb-8 text-lg">
              Starte jetzt mit GreenLog und werde Teil der Community.
            </p>
          </ScrollAnimator>
          <ScrollAnimator animation="fade-up" delay={200}>
            <CTAForm />
          </ScrollAnimator>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 bg-white border-t border-gray-200">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © 2026 GreenLog. Alle Rechte vorbehalten.
          </p>
          <div className="flex gap-6">
            <Link href="/impressum" className="text-sm text-gray-500 hover:text-green-600 transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="text-sm text-gray-500 hover:text-green-600 transition-colors">
              Datenschutz
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
