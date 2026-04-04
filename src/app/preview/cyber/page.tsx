"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Terminal, Database, Network, Cpu, Shield, Zap, Activity } from "lucide-react";

const gridLines = Array.from({ length: 20 }, (_, i) => i);

export default function CyberLanding() {
  const [time, setTime] = useState(new Date());
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#00ff41] relative overflow-hidden">
      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Vertical lines */}
        <div className="absolute inset-0 flex">
          {gridLines.map((i) => (
            <div key={i} className="flex-1 border-r border-[#00ff41]/[0.03]" />
          ))}
        </div>
        {/* Horizontal lines */}
        <div className="absolute inset-0 flex flex-col">
          {gridLines.map((i) => (
            <div key={`h-${i}`} className="flex-1 border-b border-[#00ff41]/[0.03]" />
          ))}
        </div>
      </div>

      {/* Scanline effect */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.1) 2px, rgba(0,255,65,0.1) 4px)",
          }}
        />
      </div>

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-[#00ff41]/20 bg-[#0a0a0a]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/preview" className="flex items-center gap-3">
            <Terminal size={20} />
            <span className="font-mono text-sm tracking-wider">
              GREEN<span className="text-[#00ff41]">LOG</span>
              <span className="text-[#00ff41]/40">_</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <span className="font-mono text-xs text-[#00ff41]/40">
              {time.toLocaleTimeString("de-DE")} UTC+1
            </span>
            <a href="#features" className="font-mono text-xs hover:text-[#00ff41] transition-colors">
              [FEATURES]
            </a>
            <a href="#about" className="font-mono text-xs hover:text-[#00ff41] transition-colors">
              [ABOUT]
            </a>
            <Link href="/login">
              <button className="font-mono text-xs px-4 py-2 border border-[#00ff41]/40 hover:bg-[#00ff41]/10 transition-colors">
                {">"} LOGIN
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 min-h-screen flex items-center px-6 pt-14">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              {/* Terminal-style header */}
              <div className="font-mono text-xs text-[#00ff41]/50 mb-6">
                <div>$ init cannalog --mode=production</div>
                <div className="text-[#00ff41]/30">[OK] System initialized</div>
                <div className="text-[#00ff41]/30">[OK] Database connected</div>
                <div className="text-[#00ff41]/30">[OK] 500+ strains loaded</div>
              </div>

              <h1 className="font-mono text-4xl md:text-6xl font-bold mb-6 leading-tight">
                <span className="text-[#00ff41]/40">{"//"}</span> CANNABIS
                <br />
                <span className="text-[#00ff41]/40">{"//"}</span> DATABASE
                <br />
                <span className="text-[#00ff41]/40">{"//"}</span>{" "}
                <span className="border-b-2 border-[#00ff41]">SYSTEM</span>
              </h1>

              <p className="font-mono text-sm text-[#00ff41]/60 mb-10 max-w-md leading-relaxed">
                {">"} Strain-Verwaltungssystem v2.0
                <br />
                {">"} Community-Plattform für Enthusiasten
                <br />
                {">"} Echtzeit-Datenbank mit 500+ Einträgen
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login">
                  <button className="group font-mono text-sm inline-flex items-center gap-3 px-6 py-4 bg-[#00ff41]/10 border border-[#00ff41]/40 hover:bg-[#00ff41]/20 transition-all">
                    <span className="text-[#00ff41]">{"$"} </span>
                    ./start.sh
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <Link href="/strains">
                  <button className="font-mono text-sm inline-flex items-center gap-3 px-6 py-4 border border-[#00ff41]/20 hover:border-[#00ff41]/40 transition-colors">
                    <span className="text-[#00ff41]/60">{"$"} </span>
                    cat strains.db
                  </button>
                </Link>
              </div>
            </div>

            {/* Data visualization panel */}
            <div className="hidden md:block">
              <div className="border border-[#00ff41]/20 rounded-lg overflow-hidden bg-[#0a0a0a]/80">
                {/* Terminal header */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-[#00ff41]/20 bg-[#00ff41]/5">
                  <div className="w-2 h-2 rounded-full bg-[#00ff41]/40" />
                  <div className="w-2 h-2 rounded-full bg-[#00ff41]/30" />
                  <div className="w-2 h-2 rounded-full bg-[#00ff41]/20" />
                  <span className="font-mono text-xs text-[#00ff41]/40 ml-2">strain_database.exe</span>
                </div>

                {/* Terminal body */}
                <div className="p-6 font-mono text-xs">
                  <div className="text-[#00ff41]/60 mb-4">
                    <span className="text-[#00ff41]/30">Query:</span> SELECT * FROM strains LIMIT 5
                  </div>

                  {/* Data rows */}
                  <div className="space-y-2">
                    {[
                      { name: "Ghost Train Haze", type: "SATIVA", thc: "34%", status: "ACTIVE" },
                      { name: "Northern Lights", type: "INDICA", thc: "21%", status: "ACTIVE" },
                      { name: "OG Kush", type: "HYBRID", thc: "23%", status: "ACTIVE" },
                      { name: "Sour Diesel", type: "SATIVA", thc: "26%", status: "ACTIVE" },
                      { name: "Blue Dream", type: "HYBRID", thc: "21%", status: "ACTIVE" },
                    ].map((strain, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 px-3 rounded border border-[#00ff41]/10 hover:border-[#00ff41]/30 hover:bg-[#00ff41]/5 transition-all cursor-pointer"
                      >
                        <span className="text-[#00ff41]/80">{strain.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-[#00ff41]/40">{strain.type}</span>
                          <span className="text-[#00ff41]/60">{strain.thc}</span>
                          <span className="text-[#00ff41]/40 text-[10px]">[{strain.status}]</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 text-[#00ff41]/30">
                    5 rows returned | Execution time: 0.003s
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="relative z-10 border-y border-[#00ff41]/20 bg-[#00ff41]/5">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "STRAINS", value: "500+" },
            { label: "USERS", value: "12,847" },
            { label: "REVIEWS", value: "48,293" },
            { label: "UPTIME", value: "99.9%" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-mono text-2xl font-bold">{stat.value}</div>
              <div className="font-mono text-[10px] text-[#00ff41]/40 tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="font-mono text-xs text-[#00ff41]/40 mb-12">
            $ ls ./features/
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Database size={24} />,
                title: "DATABASE",
                desc: "Vollständige Strain-Datenbank mit THC, CBD, Terpenen und Genetik-Daten.",
              },
              {
                icon: <Network size={24} />,
                title: "NETWORK",
                desc: "Community-Plattform zum Teilen von Erfahrungen und Bewertungen.",
              },
              {
                icon: <Activity size={24} />,
                title: "ANALYTICS",
                desc: "Detaillierte Statistiken und Auswertungen deiner Sammlung.",
              },
              {
                icon: <Cpu size={24} />,
                title: "AUTOMATION",
                desc: "Automatische Updates und Benachrichtigungen bei neuen Strains.",
              },
              {
                icon: <Shield size={24} />,
                title: "SECURITY",
                desc: "DSGVO-konform mit Ende-zu-Ende Verschlüsselung.",
              },
              {
                icon: <Zap size={24} />,
                title: "PERFORMANCE",
                desc: "Blitzschnelle Suche und Filterung in Echtzeit.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 border border-[#00ff41]/10 hover:border-[#00ff41]/40 hover:bg-[#00ff41]/5 transition-all cursor-pointer"
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-[#00ff41]">{feature.icon}</div>
                  <span className="font-mono text-[10px] text-[#00ff41]/30">
                    {hoveredCard === i ? "[ACTIVE]" : "[IDLE]"}
                  </span>
                </div>
                <h3 className="font-mono text-sm font-bold mb-3">{feature.title}</h3>
                <p className="font-mono text-xs text-[#00ff41]/50 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6 border-t border-[#00ff41]/20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="font-mono text-xs text-[#00ff41]/40 mb-8">
            $ ./deploy.sh --target=production
          </div>
          <h2 className="font-mono text-3xl md:text-4xl font-bold mb-6">
            SYSTEM BEREIT
          </h2>
          <p className="font-mono text-sm text-[#00ff41]/50 mb-10 max-w-md mx-auto">
            Initialisiere dein Konto und erhalte Zugriff auf das gesamte System.
          </p>
          <Link href="/login">
            <button className="group font-mono text-sm inline-flex items-center gap-3 px-10 py-5 bg-[#00ff41]/10 border border-[#00ff41]/40 hover:bg-[#00ff41]/20 transition-all">
              <span className="text-[#00ff41]">{"$"} </span>
              ./register.sh --new-user
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-6 px-6 border-t border-[#00ff41]/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-mono text-xs text-[#00ff41]/30">
            © 2026 GREENLOG // ALL SYSTEMS OPERATIONAL
          </span>
          <div className="flex gap-6">
            <Link href="/impressum" className="font-mono text-xs text-[#00ff41]/30 hover:text-[#00ff41] transition-colors">
              [IMPRESSUM]
            </Link>
            <Link href="/datenschutz" className="font-mono text-xs text-[#00ff41]/30 hover:text-[#00ff41] transition-colors">
              [DATENSCHUTZ]
            </Link>
            <Link href="/agb" className="font-mono text-xs text-[#00ff41]/30 hover:text-[#00ff41] transition-colors">
              [AGB]
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
