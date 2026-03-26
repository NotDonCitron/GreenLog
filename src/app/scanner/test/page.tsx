"use client";

import { Card } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

const TEST_LABELS = [
  { name: "GODFATHER OG", charge: "BATCH-88291", thc: "31.4%" },
  { name: "ANIMAL FACE", charge: "BATCH-44102", thc: "28.5%" },
  { name: "GMO COOKIES", charge: "BATCH-11920", thc: "30.1%" },
  { name: "GELATO 33", charge: "BATCH-22031", thc: "24.2%" },
  { name: "SOUR DIESEL", charge: "BATCH-99381", thc: "21.0%" },
];

export default function ScannerTestPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-8 pb-20">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00F5FF]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#2FF801]/5 blur-[80px] rounded-full" />
      </div>

      <div className="max-w-2xl mx-auto space-y-12 relative z-10">
        <div className="flex items-center gap-4 border-b border-[var(--border)]/50 pb-6">
          <Link href="/scanner" className="p-2 hover:bg-[var(--card)] rounded-full transition-all">
            <ChevronLeft size={24} className="text-[var(--foreground)]" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-[var(--foreground)]">Scanner Test-Zentrum</h1>
            <p className="text-[var(--muted-foreground)] text-sm">Nutze diese Etiketten, um die Texterkennung deiner App zu prüfen.</p>
          </div>
        </div>

        <div className="grid gap-12">
          {TEST_LABELS.map((label) => (
            <div key={label.name} className="space-y-4">
              <h2 className="text-xs font-black text-[#00F5FF] uppercase tracking-widest">Test-Etikett für {label.name}</h2>
              <div className="border-4 border-[#00F5FF]/30 p-8 bg-[var(--card)] shadow-sm flex flex-col items-center text-center space-y-4 rounded-3xl">
                <div className="w-full border-b-2 border-[var(--border)]/50 pb-4 mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">Apotheken-Zertifikat</p>
                </div>
                <p className="text-sm font-mono text-[var(--muted-foreground)]">{label.charge}</p>
                <h3 className="text-5xl font-black italic tracking-tighter font-display text-[var(--foreground)]">{label.name}</h3>
                <div className="flex gap-8 pt-4">
                  <div className="text-center">
                    <p className="text-[8px] font-bold uppercase text-[var(--muted-foreground)]">Potenz</p>
                    <p className="text-xl font-bold text-[#2FF801]">{label.thc} THC</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-bold uppercase text-[var(--muted-foreground)]">Menge</p>
                    <p className="text-xl font-bold text-[var(--foreground)]">15.0g</p>
                  </div>
                </div>
                <div className="w-full border-t-2 border-[var(--border)]/50 pt-4 mt-2">
                  <p className="text-[8px] font-bold uppercase text-[#484849]">Gescannt mit CANNALOG v1.0</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--card)] border-t border-[var(--border)]/50 text-center text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
        Hinweis: Diese Seite dient nur zu Testzwecken der OCR-Erkennung.
      </div>
    </main>
  );
}
