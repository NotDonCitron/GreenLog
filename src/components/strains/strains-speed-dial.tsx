"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Plus, Camera, Scale, X, ArrowLeft } from "lucide-react";
import { CreateStrainModal } from "./create-strain-modal";

interface StrainsSpeedDialProps {
  compareCount: number;
  compareLink?: string;
  onClearCompare: () => void;
  onStrainCreated: (strainId: string, slug: string, strainSource: string, usedSourceFallback?: boolean) => void;
  onEnterCompareMode?: () => void;
  compareMode?: boolean;
  onExitCompareMode?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
}

export function StrainsSpeedDial({
  compareCount,
  compareLink,
  onClearCompare,
  onStrainCreated,
  onEnterCompareMode,
  compareMode = false,
  onExitCompareMode,
}: StrainsSpeedDialProps) {
  const [open, setOpen] = useState(false);
  const [showCompareToast, setShowCompareToast] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Show compare toast when count reaches 2+
  useEffect(() => {
    if (compareCount >= 2) {
      setShowCompareToast(true);
    }
  }, [compareCount]);

  // Close speed-dial when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3">
      {/* Compare toast (appears above FAB) */}
      {showCompareToast && compareCount >= 2 && (
        <div className="bg-[#121212] border border-[#2FF801]/30 rounded-2xl p-3 shadow-lg shadow-[#2FF801]/10 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 mb-2">
            <Scale size={14} className="text-[#2FF801]" />
            <span className="text-xs font-bold text-white">
              {compareCount} Strain{compareCount > 1 ? "s" : ""} gewählt
            </span>
            <button
              onClick={() => setShowCompareToast(false)}
              className="ml-1 p-0.5 rounded text-white/40 hover:text-white/70 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
          <div className="flex gap-2">
            {compareLink && (
              <Link
                href={compareLink}
                onClick={() => setOpen(false)}
                className="flex-1 px-3 py-2 rounded-xl text-[10px] font-bold bg-gradient-to-r from-[#2FF801] to-[#2fe000] text-black hover:opacity-90 transition-all flex items-center justify-center gap-1"
              >
                <Scale size={10} />
                Vergleichen
              </Link>
            )}
            <button
              onClick={() => { onClearCompare(); setShowCompareToast(false); }}
              className="px-3 py-2 rounded-xl text-[10px] font-bold bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 transition-all"
            >
              Zurücksetzen
            </button>
          </div>
        </div>
      )}

      {/* Secondary actions (slide up when open) */}
      <div className={`flex flex-col items-end gap-3 transition-all duration-300 ${open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
        {!compareMode && onEnterCompareMode && (
          <button
            onClick={() => { onEnterCompareMode(); setOpen(false); }}
            className="flex items-center gap-3 group"
          >
            <span className="text-xs font-bold text-white bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              Vergleichen
            </span>
            <div className="w-12 h-12 bg-gradient-to-br from-[#2FF801] to-[#2fe000] text-black rounded-full flex items-center justify-center shadow-lg shadow-[#2FF801]/30 transition-transform active:scale-95">
              <Scale size={20} />
            </div>
          </button>
        )}

        {compareCount >= 2 && compareLink && !compareMode && (
          <Link
            href={compareLink}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 group"
          >
            <span className="text-xs font-bold text-white bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              Vergleichen
            </span>
            <button className="w-12 h-12 bg-gradient-to-br from-[#2FF801] to-[#2fe000] text-black rounded-full flex items-center justify-center shadow-lg shadow-[#2FF801]/30 transition-transform active:scale-95">
              <Scale size={20} />
            </button>
          </Link>
        )}

        {!compareMode && (
          <>
            <Link href="/scanner" onClick={() => setOpen(false)} className="flex items-center gap-3 group">
              <span className="text-xs font-bold text-white bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                Scanner
              </span>
              <button className="w-12 h-12 bg-gradient-to-br from-[#00F5FF] to-[#00e5ee] text-black rounded-full flex items-center justify-center shadow-lg shadow-[#00F5FF]/30 transition-transform active:scale-95">
                <Camera size={20} />
              </button>
            </Link>

            <CreateStrainModal
              onSuccess={(strainId, slug, strainSource, usedSourceFallback) => {
                onStrainCreated(strainId, slug, strainSource, usedSourceFallback);
                setOpen(false);
              }}
              trigger={
                <div className="flex items-center gap-3 group cursor-pointer">
                  <span className="text-xs font-bold text-white bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    Neue Sorte
                  </span>
                  <button className="w-12 h-12 bg-gradient-to-br from-[#9b59b6] to-[#8e44ad] text-white rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30 transition-transform active:scale-95">
                    <Plus size={20} />
                  </button>
                </div>
              }
            />
          </>
        )}
      </div>

      {/* Main FAB toggle */}
      <button
        onClick={() => {
          if (compareMode) {
            onExitCompareMode?.();
            return;
          }
          setOpen(!open);
        }}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 active:scale-95 ${
          compareMode
            ? "bg-[#ff716c] text-white"
            : open
              ? "bg-[#121212] border border-white/20 text-white rotate-45"
              : "bg-gradient-to-br from-[#2FF801] to-[#2fe000] text-black"
        }`}
      >
        {compareMode ? <ArrowLeft size={28} /> : <Plus size={28} />}
      </button>
    </div>
  );
}
