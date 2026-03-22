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
    <main className="min-h-screen bg-white text-black p-8 pb-20">
      <div className="max-w-2xl mx-auto space-y-12">
        <div className="flex items-center gap-4 border-b pb-6">
          <Link href="/scanner" className="p-2 hover:bg-gray-100 rounded-full transition-all">
            <ChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Scanner Test-Zentrum</h1>
            <p className="text-gray-500 text-sm">Nutze diese Etiketten, um die Texterkennung deiner App zu prüfen.</p>
          </div>
        </div>

        <div className="grid gap-12">
          {TEST_LABELS.map((label) => (
            <div key={label.name} className="space-y-4">
              <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest">Test-Etikett für {label.name}</h2>
              <div className="border-4 border-black p-8 bg-white shadow-sm flex flex-col items-center text-center space-y-4">
                <div className="w-full border-b-2 border-black pb-4 mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Apotheken-Zertifikat</p>
                </div>
                <p className="text-sm font-mono">{label.charge}</p>
                <h3 className="text-5xl font-black italic tracking-tighter">{label.name}</h3>
                <div className="flex gap-8 pt-4">
                  <div className="text-center">
                    <p className="text-[8px] font-bold uppercase">Potenz</p>
                    <p className="text-xl font-bold">{label.thc} THC</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-bold uppercase">Menge</p>
                    <p className="text-xl font-bold">15.0g</p>
                  </div>
                </div>
                <div className="w-full border-t-2 border-black pt-4 mt-2">
                  <p className="text-[8px] font-bold uppercase">Gescannt mit CANNALOG v1.0</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-yellow-100 border-t border-yellow-200 text-yellow-800 text-center text-xs font-bold uppercase tracking-widest">
        Hinweis: Diese Seite dient nur zu Testzwecken der OCR-Erkennung.
      </div>
    </main>
  );
}
