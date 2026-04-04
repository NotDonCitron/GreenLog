"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Grid3X3, Users, Star, ChevronRight } from "lucide-react";

const features = [
  {
    number: "01",
    title: "Strain-Verwaltung",
    description: "Strukturierte Datenbank mit allen relevanten Informationen zu THC, CBD, Terpenen und Genetik.",
  },
  {
    number: "02",
    title: "Community",
    description: "Vernetze dich mit anderen, teile Erfahrungen und entdecke neue Sorten durch Empfehlungen.",
  },
  {
    number: "03",
    title: "Bewertungen",
    description: "Transparentes Bewertungssystem hilft bei der Auswahl der richtigen Sorte.",
  },
];

export default function MinimalLanding() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Thin top line */}
      <div className="fixed top-0 left-0 right-0 h-px bg-black z-50" />

      {/* HEADER */}
      <header className="fixed top-1 left-0 right-0 z-40 px-8 py-5 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/preview" className="text-lg font-medium tracking-tight">
            GreenLog
          </Link>
          <nav className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-sm text-neutral-500 hover:text-black transition-colors">
              Features
            </a>
            <a href="#about" className="text-sm text-neutral-500 hover:text-black transition-colors">
              Über uns
            </a>
            <Link href="/login">
              <button className="text-sm font-medium border-b border-black pb-0.5 hover:text-neutral-600 hover:border-neutral-600 transition-colors">
                Anmelden
              </button>
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="min-h-screen flex items-center px-8 pt-20">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-7">
              <div className="text-xs font-medium tracking-widest uppercase text-neutral-400 mb-8">
                Cannabis-Plattform — 2026
              </div>
              <h1 className="text-6xl md:text-8xl font-medium leading-[0.95] tracking-tight mb-10">
                Deine Plattform
                <br />
                <span className="text-neutral-300">für Cannabis.</span>
              </h1>
            </div>
            <div className="md:col-span-5 md:pt-32">
              <p className="text-lg text-neutral-500 leading-relaxed mb-10 max-w-sm">
                Verwalte Strains, teile Bewertungen und entdecke neue Sorten. Einfach und strukturiert.
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/login">
                  <button className="group inline-flex items-center gap-3 text-sm font-medium">
                    <span className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center group-hover:bg-neutral-800 transition-colors">
                      <ArrowRight size={16} />
                    </span>
                    Jetzt starten
                  </button>
                </Link>
                <Link href="/strains">
                  <button className="group inline-flex items-center gap-3 text-sm text-neutral-500 hover:text-black transition-colors">
                    <span className="w-10 h-10 rounded-full border border-neutral-200 flex items-center justify-center group-hover:border-black transition-colors">
                      <ArrowRight size={16} />
                    </span>
                    Strains ansehen
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Large decorative grid */}
          <div className="mt-24 grid grid-cols-4 gap-px bg-neutral-100">
            {["500+", "12k", "98%", "4.9"].map((val, i) => (
              <div key={i} className="bg-white p-8">
                <div className="text-3xl font-medium mb-1">{val}</div>
                <div className="text-xs text-neutral-400 uppercase tracking-wider">
                  {["Strains", "Nutzer", "Zufriedenheit", "Bewertung"][i]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES - List style */}
      <section id="features" className="py-32 px-8 border-t border-neutral-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between mb-16">
            <h2 className="text-4xl font-medium tracking-tight">Features</h2>
            <span className="text-sm text-neutral-400">03 Module</span>
          </div>

          <div className="divide-y divide-neutral-100">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group py-10 grid md:grid-cols-12 gap-6 items-center cursor-pointer"
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="md:col-span-1">
                  <span className="text-xs text-neutral-300 font-mono">{feature.number}</span>
                </div>
                <div className="md:col-span-4">
                  <h3 className="text-2xl font-medium group-hover:text-neutral-600 transition-colors">
                    {feature.title}
                  </h3>
                </div>
                <div className="md:col-span-5">
                  <p className="text-neutral-500 leading-relaxed">{feature.description}</p>
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <div
                    className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 ${
                      hoveredFeature === i
                        ? "border-black bg-black text-white"
                        : "border-neutral-200 text-neutral-300"
                    }`}
                  >
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Large typography section */}
      <section className="py-32 px-8 bg-neutral-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <h2 className="text-5xl font-medium leading-tight tracking-tight mb-8">
                Einfach, was
                <br />
                <span className="text-neutral-300">zählt.</span>
              </h2>
            </div>
            <div className="space-y-6 text-neutral-500 leading-relaxed">
              <p>
                GreenLog konzentriert sich auf das Wesentliche: Eine klare Struktur für deine Cannabis-Sammlung, transparente Bewertungen und eine Community, die Wissen teilt.
              </p>
              <p>
                Keine überflüssigen Features. Keine Ablenkung. Nur die Tools, die du wirklich brauchst – sauber implementiert und durchdacht designed.
              </p>
              <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-black hover:text-neutral-600 transition-colors">
                Mehr erfahren <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-medium tracking-tight mb-3">Loslegen</h2>
              <p className="text-neutral-500">Registriere dich kostenlos und starte jetzt.</p>
            </div>
            <Link href="/login">
              <button className="group inline-flex items-center gap-3 px-8 py-4 bg-black text-white text-sm font-medium hover:bg-neutral-800 transition-colors">
                Registrieren
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-8 border-t border-neutral-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-xs text-neutral-400">© 2026 GreenLog</span>
          <div className="flex gap-6">
            <Link href="/impressum" className="text-xs text-neutral-400 hover:text-black transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="text-xs text-neutral-400 hover:text-black transition-colors">
              Datenschutz
            </Link>
            <Link href="/agb" className="text-xs text-neutral-400 hover:text-black transition-colors">
              AGB
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
