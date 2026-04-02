"use client";

import { Scale } from "lucide-react";
import { Strain } from "@/lib/types";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback } from "react";
import { MAX_COMPARE_STRAINS } from "@/lib/constants";

interface CompareButtonProps {
  strain: Strain;
}

export function CompareButton({ strain }: CompareButtonProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const compareSlugs = searchParams.get("compare")?.split(",").filter(Boolean) || [];
  const isSelected = compareSlugs.includes(strain.slug);

  const toggleCompare = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const current = searchParams.get("compare")?.split(",").filter(Boolean) || [];
    let next: string[];

    if (isSelected) {
      next = current.filter(s => s !== strain.slug);
    } else if (current.length < MAX_COMPARE_STRAINS) {
      next = [...current, strain.slug];
    } else {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (next.length === 0) {
      params.delete("compare");
    } else {
      params.set("compare", next.join(","));
    }

    router.push(`?${params.toString()}`, { scroll: false });
  }, [strain.slug, isSelected, searchParams, router]);

  return (
    <button
      onClick={toggleCompare}
      title={isSelected ? "Aus Vergleich entfernen" : "Zum Vergleich hinzufügen"}
      className={`p-1.5 rounded-full transition-all ${
        isSelected
          ? "bg-[#2FF801] text-black"
          : "bg-black/50 backdrop-blur-md text-white/70 hover:text-white hover:bg-black/70"
      }`}
    >
      <Scale size={14} />
    </button>
  );
}