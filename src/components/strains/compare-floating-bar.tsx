"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Scale, X } from "lucide-react";
import { MAX_COMPARE_STRAINS } from "@/lib/constants";

export function CompareFloatingBar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  const compareSlugs = searchParams.get("compare")?.split(",").filter(Boolean) || [];
  const count = compareSlugs.length;

  useEffect(() => {
    const handleChange = () => {
      const slugs = new URLSearchParams(window.location.search).get("compare")?.split(",").filter(Boolean) || [];
      setVisible(slugs.length >= 2);
    };

    window.addEventListener("comparechange", handleChange);
    handleChange();
    return () => window.removeEventListener("comparechange", handleChange);
  }, []);

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("compare");
    router.push(`/strains?${params.toString()}`);
    setVisible(false);
  };

  if (!visible || count < 2) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3">
      <div className="bg-[#121212] border border-[#2FF801]/30 rounded-2xl p-3 shadow-lg shadow-[#2FF801]/10 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <Scale size={14} className="text-[#2FF801]" />
          <span className="text-xs font-bold text-white">
            {count} Strain{count > 1 ? "s" : ""} gewählt
          </span>
          <button
            onClick={clearAll}
            className="ml-1 p-0.5 rounded text-white/40 hover:text-white/70 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearAll}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-[#252525] text-white/60 border border-[#333] hover:border-[#00F5FF]/50 transition-all"
          >
            Leeren
          </button>
          <Link
            href={`/strains/compare?slugs=${compareSlugs.join(",")}`}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-gradient-to-r from-[#2FF801] to-[#2fe000] text-black hover:opacity-90 transition-all flex items-center gap-1"
          >
            <Scale size={10} />
            Vergleichen
          </Link>
        </div>
      </div>
    </div>
  );
}