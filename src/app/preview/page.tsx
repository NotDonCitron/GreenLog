"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Leaf, Minus, LayoutGrid, Terminal, Crown, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

const landingConcepts = [
  {
    id: "organic",
    name: "Organic / Natural",
    description: "Warme Erdtöne, organische Formen, Blatt-Motive, weiche Gradienten – natürlicher Look",
    icon: <Leaf size={28} />,
    color: "from-green-500 to-emerald-600",
    bg: "bg-[#f5f0e8]",
    textColor: "text-[#2c2416]",
  },
  {
    id: "minimal",
    name: "Minimal / Swiss",
    description: "Clean Typography, Grid-basiert, viel Whitespace, subtile Animationen – reduziert & elegant",
    icon: <Minus size={28} />,
    color: "from-neutral-700 to-black",
    bg: "bg-white",
    textColor: "text-black",
  },
  {
    id: "bento",
    name: "Bento Modern",
    description: "Card-basiertes Bento Grid Layout, Apple-inspiriert, moderne UI-Patterns",
    icon: <LayoutGrid size={28} />,
    color: "from-blue-500 to-indigo-600",
    bg: "bg-[#fafafa]",
    textColor: "text-[#1a1a1a]",
  },
  {
    id: "cyber",
    name: "Cyber Data",
    description: "Tech-fokussiert, Grid-Patterns, Data-Visualization Ästhetik, Matrix-artig",
    icon: <Terminal size={28} />,
    color: "from-green-600 to-green-800",
    bg: "bg-[#0a0a0a]",
    textColor: "text-[#00ff41]",
  },
  {
    id: "premium",
    name: "Premium Luxury",
    description: "Gold-Akzente, dunkle reiche Hintergründe, elegante Typografie – High-End Feeling",
    icon: <Crown size={28} />,
    color: "from-amber-500 to-yellow-600",
    bg: "bg-[#0c0c0c]",
    textColor: "text-[#f5f0e8]",
  },
];

const cardConcepts = [
  {
    id: "organic",
    name: "Organic Cards",
    description: "Runde Formen, warme Farben, Serif-Typografie, weiche Schatten",
    icon: <Leaf size={28} />,
    color: "from-green-500 to-emerald-600",
    bg: "bg-[#f5f0e8]",
    textColor: "text-[#2c2416]",
  },
  {
    id: "minimal",
    name: "Minimal Cards",
    description: "Clean, reduziert, Grayscale-Hover, typografie-fokussiert",
    icon: <Minus size={28} />,
    color: "from-neutral-700 to-black",
    bg: "bg-white",
    textColor: "text-black",
  },
  {
    id: "bento",
    name: "Bento Cards",
    description: "Moderne Cards mit Gradient-Badges, Stats-Grids, horizontale Varianten",
    icon: <LayoutGrid size={28} />,
    color: "from-blue-500 to-indigo-600",
    bg: "bg-[#fafafa]",
    textColor: "text-[#1a1a1a]",
  },
  {
    id: "cyber",
    name: "Cyber Cards",
    description: "Terminal-Style, HUD-Overlays, Data-Panel, Matrix-Ästhetik",
    icon: <Terminal size={28} />,
    color: "from-green-600 to-green-800",
    bg: "bg-[#0a0a0a]",
    textColor: "text-[#00ff41]",
  },
  {
    id: "premium",
    name: "Premium Cards",
    description: "Gold-Gradient-Borders, elegante Typografie, Luxury-Feeling",
    icon: <Crown size={28} />,
    color: "from-amber-500 to-yellow-600",
    bg: "bg-[#0c0c0c]",
    textColor: "text-[#f5f0e8]",
  },
];

export default function PreviewIndex() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/preview");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[120%] h-[50%] bg-[#00F5FF]/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[100%] h-[40%] bg-[#2FF801]/4 blur-[100px] rounded-full animate-pulse [animation-delay:2s]" />
      </div>

      <div className="relative z-10 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 font-display">
              Design Konzepte
            </h1>
            <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto">
              5 Landing Page + 5 Strain Card Konzepte für GreenLog.
            </p>
          </div>

          {/* Landing Pages */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-px bg-[#00F5FF]/40" />
              <h2 className="text-sm uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Landing Pages</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {landingConcepts.map((concept) => (
                <Link key={`landing-${concept.id}`} href={`/preview/${concept.id}`}>
                  <div className="group relative rounded-2xl overflow-hidden border border-[var(--border)]/50 hover:border-[var(--border)] transition-all duration-300 hover:shadow-2xl hover:shadow-[#00F5FF]/5">
                    <div className={`h-2 bg-gradient-to-r ${concept.color}`} />
                    <div className="p-6 bg-[var(--card)]">
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${concept.color} flex items-center justify-center text-white shrink-0`}>
                          {concept.icon}
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-lg mb-1">{concept.name}</h3>
                          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                            {concept.description}
                          </p>
                        </div>
                      </div>
                      <div className={`mt-4 p-3 rounded-lg ${concept.bg} ${concept.textColor}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium opacity-60">Vorschau</span>
                          <div className="flex items-center gap-1 text-xs font-medium opacity-60 group-hover:opacity-100 transition-opacity">
                            Ansehen
                            <ArrowRight size={12} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Strain Cards */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-px bg-[#2FF801]/40" />
              <h2 className="text-sm uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Strain Cards</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {cardConcepts.map((concept) => (
                <Link key={`card-${concept.id}`} href={`/preview/cards/${concept.id}`}>
                  <div className="group relative rounded-2xl overflow-hidden border border-[var(--border)]/50 hover:border-[var(--border)] transition-all duration-300 hover:shadow-2xl hover:shadow-[#2FF801]/5">
                    <div className={`h-2 bg-gradient-to-r ${concept.color}`} />
                    <div className="p-6 bg-[var(--card)]">
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${concept.color} flex items-center justify-center text-white shrink-0`}>
                          {concept.icon}
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-lg mb-1">{concept.name}</h3>
                          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                            {concept.description}
                          </p>
                        </div>
                      </div>
                      <div className={`mt-4 p-3 rounded-lg ${concept.bg} ${concept.textColor}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium opacity-60">Vorschau</span>
                          <div className="flex items-center gap-1 text-xs font-medium opacity-60 group-hover:opacity-100 transition-opacity">
                            Ansehen
                            <ArrowRight size={12} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <div className="text-center pb-12">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[#00F5FF] transition-colors">
              Zurück zur App
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
