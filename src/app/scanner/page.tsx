"use client";

import { BottomNav } from "@/components/bottom-nav";
import { X, Zap, Image as ImageIcon, Camera } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ScannerPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-white/5 border border-white/10">
          <X size={20} />
        </button>
        <div className="flex gap-4">
          <button className="p-2 rounded-full bg-white/5 border border-white/10 text-yellow-400">
            <Zap size={20} fill="currentColor" />
          </button>
          <button className="p-2 rounded-full bg-white/5 border border-white/10">
            <ImageIcon size={20} />
          </button>
        </div>
      </div>

      {/* Camera Viewport Placeholder */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Subtiler Fokus-Rahmen */}
        <div className="relative w-72 h-72">
          {/* Ecken des Rahmens */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#00F5FF] rounded-tl-2xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#00F5FF] rounded-tr-2xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#00F5FF] rounded-bl-2xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#00F5FF] rounded-br-2xl" />
          
          {/* Zentrierter Scan-Strahl (sehr dezent) */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-[#00F5FF]/30 shadow-[0_0_10px_#00F5FF] animate-scan" />
        </div>

        {/* Hintergrund-Animation/Textur */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] repeat" />
        </div>
      </div>

      {/* Bottom Instructions */}
      <div className="p-12 pb-32 flex flex-col items-center gap-6 bg-gradient-to-t from-black to-transparent z-10">
        <div className="text-center space-y-2">
          <h2 className="text-sm font-bold tracking-[0.3em] uppercase text-[#00F5FF]">Scanner Aktiv</h2>
          <p className="text-xs text-white/40 uppercase tracking-widest leading-relaxed">
            Positioniere den QR-Code oder das <br /> Apotheken-Etikett im Rahmen
          </p>
        </div>

        {/* Shutter Button (Clean) */}
        <button className="w-20 h-20 rounded-full border-4 border-white/10 p-1 bg-white/5 hover:bg-white/10 transition-all active:scale-95">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            <Camera size={32} className="text-black" />
          </div>
        </button>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
      `}</style>

      <BottomNav />
    </main>
  );
}
