"use client";

import { Strain } from "@/lib/types";
import { StrainCompareCard } from "./strain-compare-card";
import Link from "next/link";

interface StrainCompareGridProps {
  strains: Strain[];
}

export function StrainCompareGrid({ strains }: StrainCompareGridProps) {
  const slots = [...strains];
  while (slots.length < 3) {
    slots.push(null as any);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {slots.slice(0, 3).map((strain, i) =>
        strain ? (
          <StrainCompareCard key={strain.id} strain={strain} />
        ) : (
          <Link
            key="placeholder"
            href="/strains"
            className="rounded-2xl border-2 border-dashed border-[#333] hover:border-[#00F5FF]/50 transition-all flex flex-col items-center justify-center min-h-[300px] text-center p-8 group"
          >
            <div className="text-4xl mb-3 text-[#333] group-hover:text-[#00F5FF]/50 transition-colors">+</div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#484849] group-hover:text-[#00F5FF]/70 transition-colors">
              3. Strain auswählen
            </p>
            <p className="text-[10px] text-[#333] mt-1">Zur Strains-Seite</p>
          </Link>
        )
      )}
    </div>
  );
}