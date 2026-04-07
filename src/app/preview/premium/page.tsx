"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Crown, Gem, Sparkles, Star, ChevronRight } from "lucide-react";

export default function PremiumLanding() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="min-h-screen bg-[#0c0c0c] text-[#f5f0e8] overflow-hidden">
      {/* Subtle gold gradient overlay */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Floating gold particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#c9a84c]/20"
            style={{
              top: `${15 + i * 15}%`,
              left: `${10 + i * 16}%`,
              transform: `translateY(${scrollY * (0.05 + i * 0.02)}px)`,
              animation: `float ${3 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/preview" className="flex items-center gap-3">
            <Crown size={22} className="text-[#c9a84c]" />
            <span className="text-lg tracking-[0.2em] uppercase font-light">
              Green<span className="text-[#c9a84c] font-normal">Log</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-xs tracking-[0.15em] uppercase text-[#f5f0e8]/50 hover:text-[#c9a84c] transition-colors">
              Features
            </a>
            <a href="#collection" className="text-xs tracking-[0.15em] uppercase text-[#f5f0e8]/50 hover:text-[#c9a84c] transition-colors">
              Kollektion
            </a>
            <Link href="/login">
              <button className="text-xs tracking-[0.15em] uppercase px-6 py-3 border border-[#c9a84c]/40 text-[#c9a84c] hover:bg-[#c9a84c]/10 transition-all">
                Zugang anfragen
              </button>
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 min-h-screen flex items-center px-8">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              {/* Gold line accent */}
              <div className="w-16 h-px bg-gradient-to-r from-[#c9a84c] to-transparent mb-8" />

              <div className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-[#c9a84c]/70 mb-8">
                <Sparkles size={14} />
                <span>Exklusive Plattform für Organisationen</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-light leading-[1.1] mb-8 tracking-tight">
                Die Kunst des
                <br />
                <span className="text-[#c9a84c] italic" style={{ fontFamily: "Georgia, serif" }}>
                  Cannabis
                </span>
              </h1>

              <p className="text-lg text-[#f5f0e8]/50 leading-relaxed mb-12 max-w-md font-light">
                Eine kuratierte Plattform für Kenner. Entdecken Sie erlesene Strains, exklusive Bewertungen und eine Community von Kennern.
              </p>

              <div className="flex flex-col sm:flex-row gap-5">
                <Link href="/login">
                  <button className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] text-[#0c0c0c] font-medium text-sm tracking-wider uppercase hover:from-[#d4b85c] hover:to-[#e0c86c] transition-all">
                    Mitglied werden
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <Link href="/strains">
                  <button className="inline-flex items-center gap-3 px-8 py-4 border border-[#f5f0e8]/20 text-[#f5f0e8]/70 font-light text-sm tracking-wider uppercase hover:border-[#c9a84c]/50 hover:text-[#c9a84c] transition-all">
                    Kollektion
                  </button>
                </Link>
              </div>
            </div>

            {/* Hero visual - luxury card display */}
            <div className="hidden md:block relative">
              <div className="relative">
                {/* Main showcase card */}
                <div className="relative p-1 rounded-2xl bg-gradient-to-br from-[#c9a84c]/40 via-[#c9a84c]/10 to-transparent">
                  <div className="p-8 rounded-2xl bg-[#141414] border border-[#c9a84c]/10">
                    {/* Strain showcase */}
                    <div className="aspect-[3/4] rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#0c0c0c] border border-[#c9a84c]/10 mb-6 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-[#c9a84c]/5 to-transparent" />
                      <div className="relative text-center">
                        <Gem size={48} className="text-[#c9a84c]/30 mx-auto mb-4" />
                        <div className="text-xs tracking-[0.3em] uppercase text-[#c9a84c]/50">Premium Selection</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-light tracking-wide">Ghost Train Haze</h3>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} className="text-[#c9a84c] fill-[#c9a84c]" />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#f5f0e8]/40 tracking-wider uppercase">
                      <span>Sativa</span>
                      <span className="w-px h-3 bg-[#f5f0e8]/20" />
                      <span>34% THC</span>
                      <span className="w-px h-3 bg-[#f5f0e8]/20" />
                      <span>Reserve</span>
                    </div>
                  </div>
                </div>

                {/* Floating accent card */}
                <div className="absolute -bottom-6 -left-8 p-4 rounded-xl bg-[#141414] border border-[#c9a84c]/20 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#c9a84c]/10 flex items-center justify-center">
                      <Crown size={18} className="text-[#c9a84c]" />
                    </div>
                    <div>
                      <div className="text-xs font-medium">Strain des Monats</div>
                      <div className="text-[10px] text-[#f5f0e8]/40 tracking-wider uppercase">Dezember 2026</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="relative z-10 max-w-6xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[#c9a84c]/30 to-transparent" />
      </div>

      {/* FEATURES */}
      <section id="features" className="relative z-10 py-24 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-[#c9a84c]/70 mb-6">
              <Gem size={14} />
              <span>Exklusiv</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-4">
              Was uns <span className="text-[#c9a84c] italic" style={{ fontFamily: "Georgia, serif" }}>auszeichnet</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Kuratierte Strains",
                desc: "Handverlesene Auswahl der feinsten Sorten. Nur die besten Strains finden ihren Weg in unsere Datenbank.",
              },
              {
                title: "Premium Community",
                desc: "Exklusiver Kreis von Kennern und Enthusiasten. Teilen Sie Ihr Wissen mit Gleichgesinnten.",
              },
              {
                title: "Exklusive Einblicke",
                desc: "Detaillierte Analysen, Terpene-Profile und Geschmacksnoten für den anspruchsvollen Kenner.",
              },
            ].map((feature, i) => (
              <div key={i} className="group text-center">
                <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/40 to-transparent mx-auto mb-8" />
                <h3 className="text-lg tracking-wider uppercase font-light mb-4">{feature.title}</h3>
                <p className="text-sm text-[#f5f0e8]/40 leading-relaxed font-light">{feature.desc}</p>
                <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/40 to-transparent mx-auto mt-8 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section className="relative z-10 py-24 px-8 bg-[#141414]/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-6">
                Für <span className="text-[#c9a84c] italic" style={{ fontFamily: "Georgia, serif" }}>Anspruchsvolle</span>
              </h2>
              <p className="text-[#f5f0e8]/50 leading-relaxed mb-8 font-light">
                GreenLog ist mehr als eine Datenbank – es ist eine Plattform für professionelles Strain-Management. Jede Sorte wird mit der Sorgfalt präsentiert, die sie verdient.
              </p>
              <div className="space-y-4">
                {["Handverlesene Qualität", "Detaillierte Terpene-Profile", "Exklusive Bewertungen", "Private Sammlung"].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-px bg-[#c9a84c]/40" />
                    <span className="text-sm tracking-wider uppercase font-light text-[#f5f0e8]/70">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Strains", value: "500+" },
                { label: "Bewertungen", value: "48k" },
                { label: "Mitglieder", value: "12k" },
                { label: "Zufriedenheit", value: "98%" },
              ].map((stat, i) => (
                <div key={i} className="p-6 rounded-xl bg-[#0c0c0c] border border-[#c9a84c]/10 text-center">
                  <div className="text-2xl text-[#c9a84c] mb-1" style={{ fontFamily: "Georgia, serif" }}>
                    {stat.value}
                  </div>
                  <div className="text-[10px] tracking-[0.2em] uppercase text-[#f5f0e8]/40">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-32 px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/40 to-transparent mx-auto mb-10" />
          <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-4">
            Werden Sie Teil der <span className="text-[#c9a84c] italic" style={{ fontFamily: "Georgia, serif" }}>Elite</span>
          </h2>
          <p className="text-[#f5f0e8]/40 mb-10 font-light max-w-md mx-auto">
            Registrieren Sie sich jetzt und erhalten Sie Zugang zu unserer exklusiven Community.
          </p>
          <Link href="/login">
            <button className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] text-[#0c0c0c] font-medium text-sm tracking-wider uppercase hover:from-[#d4b85c] hover:to-[#e0c86c] transition-all">
              Zugang anfragen
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-8 px-8 border-t border-[#c9a84c]/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Crown size={16} className="text-[#c9a84c]/50" />
            <span className="text-xs tracking-[0.2em] uppercase text-[#f5f0e8]/30">
              © 2026 GreenLog
            </span>
          </div>
          <div className="flex gap-8">
            <Link href="/impressum" className="text-xs tracking-wider uppercase text-[#f5f0e8]/30 hover:text-[#c9a84c] transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="text-xs tracking-wider uppercase text-[#f5f0e8]/30 hover:text-[#c9a84c] transition-colors">
              Datenschutz
            </Link>
            <Link href="/agb" className="text-xs tracking-wider uppercase text-[#f5f0e8]/30 hover:text-[#c9a84c] transition-colors">
              AGB
            </Link>
          </div>
        </div>
      </footer>

      {/* Float animation */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </main>
  );
}
