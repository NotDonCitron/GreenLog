"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
        <Plus size={32} className="text-[var(--foreground)]/20" />
      </div>
      <h2 className="text-xl font-bold mb-2">Deine Collection ist leer</h2>
      <p className="text-[var(--foreground)]/40 text-sm mb-8 leading-relaxed max-w-[240px]">
        Füge deine ersten Strains hinzu, um dein digitales Sammelalbum zu starten.
      </p>
      <Link href="/strains">
        <button className="px-10 py-4 bg-white text-black font-black rounded-2xl uppercase tracking-widest text-sm hover:bg-[#00F5FF] transition-all">
          Zum Katalog
        </button>
      </Link>
    </div>
  );
}
