"use client";

import Link from "next/link";
import { ArrowRight, Leaf, Users, Star, Search, BarChart3, Shield, Zap } from "lucide-react";

export default function BentoLanding() {
  return (
    <main className="min-h-screen bg-[#fafafa] text-[#1a1a1a]">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/preview" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
              <Leaf size={16} className="text-white" />
            </div>
            <span className="font-semibold text-lg">GreenLog</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-neutral-500 hover:text-black transition-colors">
              Features
            </a>
            <a href="#community" className="text-sm text-neutral-500 hover:text-black transition-colors">
              Community
            </a>
            <Link href="/login">
              <button className="px-5 py-2.5 rounded-xl bg-[#1a1a1a] text-white text-sm font-medium hover:bg-neutral-800 transition-colors">
                Anmelden
              </button>
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-100 text-sm text-neutral-600 mb-6">
            <Zap size={14} />
            <span>Die moderne Plattform für Strain-Management</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-6">
            Alles rund um
            <br />
            <span className="text-neutral-300">Strains.</span>
          </h1>
          <p className="text-xl text-neutral-500 max-w-xl mx-auto mb-10">
            Strains verwalten, Community entdecken, Bewertungen teilen – alles an einem Ort.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <button className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#1a1a1a] text-white font-medium text-lg hover:bg-neutral-800 transition-all hover:shadow-xl hover:shadow-neutral-200">
                Jetzt starten
                <ArrowRight size={20} />
              </button>
            </Link>
            <Link href="/strains">
              <button className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white border border-neutral-200 text-[#1a1a1a] font-medium text-lg hover:border-neutral-300 hover:shadow-lg transition-all">
                Strains entdecken
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* BENTO GRID */}
      <section id="features" className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Large card - Strain Database */}
            <div className="md:col-span-2 md:row-span-2 p-8 rounded-3xl bg-white border border-neutral-200 hover:shadow-xl hover:shadow-neutral-100 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white mb-6">
                <Leaf size={28} />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Strain-Datenbank</h3>
              <p className="text-neutral-500 leading-relaxed mb-8 max-w-md">
                Über 500 Strains mit detaillierten Profilen: THC, CBD, Terpene, Effekte und Aromen. Finde deine perfekte Sorte.
              </p>
              {/* Mini strain cards preview */}
              <div className="flex gap-3">
                <div className="flex-1 p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                  <div className="w-full h-16 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 mb-3 opacity-80" />
                  <div className="font-medium text-sm">Sativa</div>
                  <div className="text-xs text-neutral-400">34% THC</div>
                </div>
                <div className="flex-1 p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                  <div className="w-full h-16 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 mb-3 opacity-80" />
                  <div className="font-medium text-sm">Indica</div>
                  <div className="text-xs text-neutral-400">21% THC</div>
                </div>
                <div className="flex-1 p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                  <div className="w-full h-16 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 mb-3 opacity-80" />
                  <div className="font-medium text-sm">Hybrid</div>
                  <div className="text-xs text-neutral-400">28% THC</div>
                </div>
              </div>
            </div>

            {/* Community card */}
            <div className="p-8 rounded-3xl bg-white border border-neutral-200 hover:shadow-xl hover:shadow-neutral-100 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white mb-5">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Community</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                12.000+ aktive Nutzer teilen ihr Wissen.
              </p>
            </div>

            {/* Reviews card */}
            <div className="p-8 rounded-3xl bg-white border border-neutral-200 hover:shadow-xl hover:shadow-neutral-100 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white mb-5">
                <Star size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Bewertungen</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                Transparente 5-Sterne Bewertungen.
              </p>
            </div>

            {/* Search card */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-[#1a1a1a] to-neutral-800 text-white hover:shadow-xl hover:shadow-neutral-300 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-5">
                <Search size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smarte Suche</h3>
              <p className="text-neutral-300 text-sm leading-relaxed">
                Filtere nach Wirkung, Geschmack und Stärke.
              </p>
            </div>

            {/* Stats card */}
            <div className="p-8 rounded-3xl bg-white border border-neutral-200 hover:shadow-xl hover:shadow-neutral-100 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white mb-5">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Statistiken</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                Detaillierte Auswertungen deiner Sammlung.
              </p>
            </div>

            {/* Security card */}
            <div className="md:col-span-2 p-8 rounded-3xl bg-white border border-neutral-200 hover:shadow-xl hover:shadow-neutral-100 transition-all duration-300 group">
              <div className="flex items-start gap-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white shrink-0">
                  <Shield size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-3">Sicher & Privat</h3>
                  <p className="text-neutral-500 leading-relaxed max-w-lg">
                    Deine Daten gehören dir. DSGVO-konform, verschlüsselt und mit voller Kontrolle über deine Privatsphäre.
                  </p>
                  <div className="flex gap-6 mt-6">
                    <div className="text-center">
                      <div className="text-2xl font-semibold">DSGVO</div>
                      <div className="text-xs text-neutral-400">Konform</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold">SSL</div>
                      <div className="text-xs text-neutral-400">Verschlüsselt</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold">100%</div>
                      <div className="text-xs text-neutral-400">Kontrolle</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA card */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 text-white hover:shadow-xl hover:shadow-green-200 transition-all duration-300 group">
              <h3 className="text-2xl font-semibold mb-3">Startklar?</h3>
              <p className="text-green-50 mb-6 leading-relaxed">
                Erstelle jetzt dein kostenloses Konto.
              </p>
              <Link href="/login">
                <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-green-600 font-medium hover:bg-green-50 transition-colors">
                  Registrieren
                  <ArrowRight size={16} />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 border-t border-neutral-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm text-neutral-400">
            © 2026 GreenLog. Alle Rechte vorbehalten.
          </span>
          <div className="flex gap-6">
            <Link href="/impressum" className="text-sm text-neutral-400 hover:text-black transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="text-sm text-neutral-400 hover:text-black transition-colors">
              Datenschutz
            </Link>
            <Link href="/agb" className="text-sm text-neutral-400 hover:text-black transition-colors">
              AGB
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
