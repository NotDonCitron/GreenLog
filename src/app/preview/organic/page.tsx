"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Leaf, Droplets, Sun, Wind, ArrowRight, Sprout, Flower2, Mountain } from "lucide-react";

const features = [
  {
    icon: <Leaf size={24} />,
    title: "Natürliche Strain-Daten",
    description: "Umfassende Profile mit Terpenen, Cannabinoiden und Anbauinformationen – direkt aus der Natur.",
  },
  {
    icon: <Droplets size={24} />,
    title: "Wasser & Nährstoffe",
    description: "Tracke deine Gießzyklen und Düngepläne für optimale Ergebnisse.",
  },
  {
    icon: <Sun size={24} />,
    title: "Licht & Klima",
    description: "Überwache Lichtzyklen, Temperatur und Luftfeuchtigkeit in Echtzeit.",
  },
  {
    icon: <Wind size={24} />,
    title: "Community Wissen",
    description: "Teile Erfahrungen und lerne von erfahrenen Growern und Enthusiasten.",
  },
];

const stats = [
  { value: "500+", label: "Strains" },
  { value: "12k", label: "Grower" },
  { value: "98%", label: "Zufriedenheit" },
  { value: "24/7", label: "Support" },
];

export default function OrganicLanding() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#2c2416] overflow-hidden">
      {/* Organic background pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 Q35 15 30 25 Q25 15 30 5z' fill='%232c2416' fill-opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Floating organic shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-96 h-96 rounded-full bg-[#8faa5c]/10 blur-3xl"
          style={{
            top: "10%",
            right: "-10%",
            transform: `translateY(${scrollY * 0.1}px)`,
          }}
        />
        <div
          className="absolute w-80 h-80 rounded-full bg-[#c4a87c]/10 blur-3xl"
          style={{
            bottom: "20%",
            left: "-5%",
            transform: `translateY(${scrollY * -0.05}px)`,
          }}
        />
        <div
          className="absolute w-64 h-64 rounded-full bg-[#6b8f3c]/8 blur-3xl"
          style={{
            top: "50%",
            left: "30%",
            transform: `translateY(${scrollY * 0.08}px)`,
          }}
        />
      </div>

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/preview" className="flex items-center gap-2">
            <Sprout className="text-[#6b8f3c]" size={28} />
            <span className="font-bold text-xl tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
              Green<span className="text-[#6b8f3c]">Log</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-[#6b5d4f] hover:text-[#6b8f3c] transition-colors">
              Features
            </a>
            <a href="#community" className="text-sm text-[#6b5d4f] hover:text-[#6b8f3c] transition-colors">
              Community
            </a>
            <Link href="/login">
              <button className="px-5 py-2.5 rounded-full bg-[#6b8f3c] text-white text-sm font-medium hover:bg-[#5a7a32] transition-colors">
                Anmelden
              </button>
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 min-h-screen flex items-center px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6b8f3c]/10 text-[#6b8f3c] text-sm font-medium mb-8">
              <Flower2 size={16} />
              <span>Für Grower & Genießer</span>
            </div>
            <h1
              className="text-5xl md:text-7xl font-bold leading-[1.1] mb-6"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Wachse mit der{" "}
              <span className="text-[#6b8f3c] italic">Natur</span>
            </h1>
            <p className="text-xl text-[#6b5d4f] mb-10 leading-relaxed max-w-lg">
              Deine Plattform für Cannabis-Kultur. Verwalte Strains, tracke dein Wachstum und verbinde dich mit Gleichgesinnten.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login">
                <button className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#6b8f3c] text-white font-medium text-lg hover:bg-[#5a7a32] transition-all hover:shadow-lg hover:shadow-[#6b8f3c]/20">
                  Jetzt starten
                  <ArrowRight size={20} />
                </button>
              </Link>
              <Link href="/strains">
                <button className="inline-flex items-center gap-3 px-8 py-4 rounded-full border-2 border-[#c4a87c] text-[#2c2416] font-medium text-lg hover:border-[#6b8f3c] hover:bg-[#6b8f3c]/5 transition-all">
                  Strains entdecken
                </button>
              </Link>
            </div>
          </div>

          {/* Hero visual - organic card stack */}
          <div className="relative hidden md:block">
            <div className="relative w-full aspect-square max-w-md mx-auto">
              {/* Background circle */}
              <div className="absolute inset-8 rounded-full bg-[#e8dcc8] border border-[#c4a87c]/30" />
              <div className="absolute inset-16 rounded-full bg-[#ddd0b8] border border-[#c4a87c]/20" />

              {/* Floating strain cards */}
              <div className="absolute top-8 right-8 w-48 p-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-[#c4a87c]/30 shadow-xl">
                <div className="w-full h-24 rounded-xl bg-gradient-to-br from-[#8faa5c] to-[#6b8f3c] mb-3" />
                <div className="font-bold text-sm">Ghost Train Haze</div>
                <div className="text-xs text-[#6b5d4f]">Sativa · 34% THC</div>
              </div>

              <div className="absolute bottom-16 left-4 w-44 p-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-[#c4a87c]/30 shadow-xl">
                <div className="w-full h-20 rounded-xl bg-gradient-to-br from-[#c4a87c] to-[#8b7355] mb-3" />
                <div className="font-bold text-sm">Northern Lights</div>
                <div className="text-xs text-[#6b5d4f]">Indica · 21% THC</div>
              </div>

              {/* Center element */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-[#6b8f3c]/20 flex items-center justify-center">
                  <Leaf size={40} className="text-[#6b8f3c]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="relative z-10 py-16 px-6 border-y border-[#c4a87c]/20 bg-white/30">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl font-bold text-[#6b8f3c] mb-1" style={{ fontFamily: "Georgia, serif" }}>
                {stat.value}
              </div>
              <div className="text-sm text-[#6b5d4f]">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Alles was deine Pflanze braucht
            </h2>
            <p className="text-lg text-[#6b5d4f] max-w-2xl mx-auto">
              Von der Samen bis zur Ernte – GreenLog begleitet dich auf dem gesamten Weg.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group p-8 rounded-3xl bg-white/60 backdrop-blur-sm border border-[#c4a87c]/20 hover:border-[#6b8f3c]/40 hover:bg-white/80 transition-all duration-300 hover:shadow-lg hover:shadow-[#6b8f3c]/5"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#6b8f3c]/10 flex items-center justify-center text-[#6b8f3c] mb-6 group-hover:bg-[#6b8f3c]/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-[#6b5d4f] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-12 rounded-[2.5rem] bg-gradient-to-br from-[#6b8f3c] to-[#5a7a32] text-white">
            <Mountain size={48} className="mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: "Georgia, serif" }}>
              Bereit loszulegen?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-lg mx-auto">
              Werde Teil unserer wachsenden Community und entdecke die Welt des Cannabis neu.
            </p>
            <Link href="/login">
              <button className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-[#6b8f3c] font-bold text-lg hover:bg-[#f5f0e8] transition-colors">
                Kostenlos registrieren
                <ArrowRight size={20} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-8 px-6 border-t border-[#c4a87c]/20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sprout className="text-[#6b8f3c]" size={20} />
            <span className="text-sm text-[#6b5d4f]">
              © 2026 GreenLog. Alle Rechte vorbehalten.
            </span>
          </div>
          <div className="flex gap-6">
            <Link href="/impressum" className="text-sm text-[#6b5d4f] hover:text-[#6b8f3c] transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="text-sm text-[#6b5d4f] hover:text-[#6b8f3c] transition-colors">
              Datenschutz
            </Link>
            <Link href="/agb" className="text-sm text-[#6b5d4f] hover:text-[#6b8f3c] transition-colors">
              AGB
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
