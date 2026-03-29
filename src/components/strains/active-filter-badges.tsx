"use client";

import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { EFFECT_OPTIONS, THC_RANGE, CBD_RANGE } from "@/lib/constants";

const EFFECT_LABEL_MAP = Object.fromEntries(
  EFFECT_OPTIONS.map((opt) => [opt.value, opt.label])
);

interface ActiveFilterBadgesProps {
  effects: string[];
  thcMin: number;
  thcMax: number;
  cbdMin: number;
  cbdMax: number;
}

export function ActiveFilterBadges({
  effects,
  thcMin,
  thcMax,
  cbdMin,
  cbdMax,
}: ActiveFilterBadgesProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasThcFilter = thcMin !== THC_RANGE.min || thcMax !== THC_RANGE.max;
  const hasCbdFilter = cbdMin !== CBD_RANGE.min || cbdMax !== CBD_RANGE.max;
  const hasFilters = effects.length > 0 || hasThcFilter || hasCbdFilter;

  if (!hasFilters) return null;

  const removeThcFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("thc_min");
    params.delete("thc_max");
    router.push(`/strains?${params.toString()}`, { scroll: false });
  };

  const removeCbdFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cbd_min");
    params.delete("cbd_max");
    router.push(`/strains?${params.toString()}`, { scroll: false });
  };

  const removeEffect = (effect: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get("effects")?.split(",").filter((v) => v !== effect) || [];
    if (current.length > 0) {
      params.set("effects", current.join(","));
    } else {
      params.delete("effects");
    }
    router.push(`/strains?${params.toString()}`, { scroll: false });
  };

  const clearAll = () => {
    router.push("/strains", { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 px-1">
      {hasThcFilter && (
        <button
          onClick={removeThcFilter}
          className="flex items-center gap-1 px-2 py-1 bg-[#00F5FF]/20 border border-[#00F5FF]/30 text-[#00F5FF] text-xs font-medium rounded-full hover:bg-[#00F5FF]/30 transition-colors"
        >
          THC: {thcMin}% — {thcMax}%
          <X size={12} />
        </button>
      )}

      {hasCbdFilter && (
        <button
          onClick={removeCbdFilter}
          className="flex items-center gap-1 px-2 py-1 bg-[#00F5FF]/20 border border-[#00F5FF]/30 text-[#00F5FF] text-xs font-medium rounded-full hover:bg-[#00F5FF]/30 transition-colors"
        >
          CBD: {cbdMin}% — {cbdMax}%
          <X size={12} />
        </button>
      )}

      {effects.map((effect) => (
        <button
          key={effect}
          onClick={() => removeEffect(effect)}
          className="flex items-center gap-1 px-2 py-1 bg-[#2FF801]/20 border border-[#2FF801]/30 text-[#2FF801] text-xs font-medium rounded-full hover:bg-[#2FF801]/30 transition-colors"
        >
          {EFFECT_LABEL_MAP[effect] || effect}
          <X size={12} />
        </button>
      ))}

      <button
        onClick={clearAll}
        className="px-2 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline underline-offset-2"
      >
        Alle löschen
      </button>
    </div>
  );
}
