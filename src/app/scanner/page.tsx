"use client";

import { useState, useRef, useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { Camera, Loader2, CheckCircle2, AlertCircle, Barcode, ScanText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Strain } from "@/lib/types";
import { triggerSuccessHaptic, triggerHaptic } from "@/lib/haptics";
import { BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
import { Capacitor } from "@capacitor/core";

export default function ScannerPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"idle" | "capturing" | "processing" | "success" | "error">("idle");
  const [mode, setStatusMode] = useState<"ocr" | "barcode">("ocr");
  const [result, setResult] = useState<string | null>(null);
  const [debugText, setDebugText] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isCapacitor, setIsCapacitor] = useState(false);
  const workerRef = useRef<unknown>(null);

  useEffect(() => {
    setIsCapacitor(Capacitor.isNativePlatform());
    async function initWorker() {
      try {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker('deu+eng');
        workerRef.current = worker;
      } catch (_err) {
        console.error("OCR Worker Fehler:", _err);
      }
    }
    initWorker();
    return () => { if (workerRef.current) (workerRef.current as { terminate: () => void }).terminate(); };
  }, []);

  useEffect(() => {
    if (mode === 'barcode' && isCapacitor) return; // Capacitor Barcode handles camera itself

    const videoEl = videoRef.current;
    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setStatus("error");
          setResult("Kamera nicht unterstützt");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          },
          audio: false
        });

        if (videoEl) {
          videoEl.srcObject = stream;
          videoEl.muted = true;
          videoEl.play().catch(_err => {
            console.error("Video play error:", _err);
          });
          setCameraActive(true);
        }
      } catch (err: unknown) {
        console.error("Camera error:", err);
        setStatus("error");
        setResult("Kamera-Fehler");
      }
    }
    startCamera();
    return () => {
      if (videoEl?.srcObject) {
        const tracks = (videoEl.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [isCapacitor, mode]);

  const findBestMatch = (text: string, strains: Strain[]) => {
    const lowerText = text.toLowerCase();
    let bestStrain = null;
    let highestScore = 0;

    for (const strain of strains) {
      const name = (strain.name as string).toLowerCase();
      const nameWords = name.split(/[\s,.\-\n]+/).filter((w: string) => w.length > 2);

      let score = 0;

      const fullRegex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (fullRegex.test(lowerText)) score += 15;

      for (const word of nameWords) {
        const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (wordRegex.test(lowerText)) score += 5;
      }

      if (score > highestScore && score >= 5) {
        highestScore = score;
        bestStrain = strain;
      }
    }
    return bestStrain;
  };

  const startBarcodeScan = async () => {
    if (!isCapacitor) {
      alert("Barcode Scanning ist nur in der mobilen App verfügbar.");
      return;
    }

    try {
      const { barcodes } = await BarcodeScanner.scan();
      if (barcodes.length > 0) {
        const code = barcodes[0].displayValue;
        setStatus("processing");
        
        // Search by barcode field (assuming it exists or searching name for now)
        const { data: matched } = await supabase
          .from("strains")
          .select("*")
          .filter("barcode", "eq", code)
          .maybeSingle();

        if (matched) {
          setResult(matched.name);
          setStatus("success");
          triggerSuccessHaptic();
          setTimeout(() => router.push(`/strains/${matched.slug}`), 1500);
        } else {
          setStatus("error");
          setResult("Barcode nicht erkannt");
          setDebugText(`Code: ${code}`);
          setTimeout(() => setStatus("idle"), 3000);
        }
      }
    } catch (e) {
      console.error(e);
      setStatus("error");
      setResult("Scan abgebrochen");
    }
  };

  const captureAndRecognize = async () => {
    if (mode === 'barcode') {
      await startBarcodeScan();
      return;
    }

    if (!videoRef.current || !canvasRef.current) return;

    setStatus("capturing");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.filter = 'contrast(1.3) brightness(1.1)';
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    setStatus("processing");
    setDebugText(null);

    try {
      let worker = workerRef.current;
      if (!worker) {
        const { createWorker } = await import("tesseract.js");
        worker = await createWorker('deu+eng');
        workerRef.current = worker;
      }

      const { data: { text } } = await (worker as any).recognize(canvas);
      const { data: allStrains } = await supabase.from("strains").select("*");
      const matchedStrain = findBestMatch(text, allStrains || []);

      if (matchedStrain) {
        setResult(matchedStrain.name);
        setStatus("success");
        triggerSuccessHaptic();
        setTimeout(() => router.push(`/strains/${matchedStrain.slug}`), 2000);
      } else {
        setStatus("error");
        setResult("Nicht gefunden");
        setDebugText(text.slice(0, 60).replace(/\n/g, ' ') + "...");
        setTimeout(() => { setStatus("idle"); setDebugText(null); }, 5000);
      }
    } catch (_err) {
      setStatus("error");
      setResult("Fehler");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <main className="h-[100dvh] bg-[var(--background)] text-[var(--foreground)] relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#00F5FF]/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[40%] bg-[#2FF801]/8 blur-[120px] rounded-full" />
      </div>

      <div className="flex-1 relative z-10 flex items-center justify-center overflow-hidden">
        {mode === 'ocr' && (
          <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transition-opacity duration-1000 ${cameraActive ? "opacity-100" : "opacity-0"}`} />
        )}
        
        {mode === 'barcode' && !isCapacitor && (
          <div className="text-center p-8 bg-[var(--card)]/50 backdrop-blur-xl rounded-3xl border border-[var(--border)]">
            <Barcode size={48} className="mx-auto mb-4 text-[#00F5FF]" />
            <p className="text-sm font-bold uppercase tracking-widest">Mobile App erforderlich</p>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2">Barcode-Scanner ist ein natives Feature</p>
          </div>
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 pointer-events-none">
          {mode === 'ocr' && !cameraActive && status !== "error" && (
            <div className="text-center text-[var(--muted-foreground)]">
              <Camera size={64} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm uppercase tracking-widest font-bold">Kamera wird geladen...</p>
            </div>
          )}

          <div className="w-full aspect-square max-w-sm border-2 border-[#00F5FF]/20 rounded-3xl relative">
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-[#00F5FF] rounded-tl-3xl shadow-[0_0_20px_#00F5FF]" />
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-[#00F5FF] rounded-tr-3xl shadow-[0_0_20px_#00F5FF]" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-[#00F5FF] rounded-bl-3xl shadow-[0_0_20px_#00F5FF]" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-[#00F5FF] rounded-br-3xl shadow-[0_0_20px_#00F5FF]" />

            {status === "processing" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl">
                <Loader2 className="animate-spin text-[#00F5FF]" size={48} />
              </div>
            )}

            {status === "success" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#2FF801]/20 backdrop-blur-sm rounded-3xl animate-in zoom-in">
                <CheckCircle2 className="text-[#2FF801]" size={64} />
                <p className="mt-4 font-black text-[#2FF801] uppercase tracking-widest">{result}</p>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>

      <div className="p-6 pb-28 flex flex-col items-center gap-6 bg-gradient-to-t from-[#0e0e0f] via-[#0e0e0f]/90 to-transparent z-20 shrink-0">
        {/* Mode Selector */}
        <div className="flex bg-[var(--card)] p-1 rounded-2xl border border-[var(--border)]/50">
          <button 
            onClick={() => { triggerHaptic(); setStatusMode('ocr'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'ocr' ? 'bg-[#00F5FF] text-black shadow-lg shadow-[#00F5FF]/20' : 'text-[var(--muted-foreground)] hover:text-white'}`}
          >
            <ScanText size={14} /> Text
          </button>
          <button 
            onClick={() => { triggerHaptic(); setStatusMode('barcode'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'barcode' ? 'bg-[#00F5FF] text-black shadow-lg shadow-[#00F5FF]/20' : 'text-[var(--muted-foreground)] hover:text-white'}`}
          >
            <Barcode size={14} /> Barcode
          </button>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xs font-black tracking-[0.3em] uppercase text-[#00F5FF]">
            {status === "processing" ? "Analysiere..." : mode === 'ocr' ? "Smart Scanner" : "Barcode Scanner"}
          </h2>
          <p className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-widest font-bold">
            {status === "error" ? result : mode === 'ocr' ? "Ziele auf den Namen der Sorte" : "Ziele auf einen Barcode"}
          </p>
        </div>

        <button
          onClick={captureAndRecognize}
          disabled={status === "processing" || status === "success"}
          className={`w-16 h-16 rounded-full border-4 border-[#00F5FF]/30 p-1 bg-[var(--card)] transition-all active:scale-95 ${status === "processing" ? "opacity-20" : "opacity-100"}`}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00F5FF] to-[#2FF801] flex items-center justify-center shadow-lg shadow-[#00F5FF]/30">
            {mode === 'ocr' ? <Camera size={28} className="text-black" /> : <Barcode size={28} className="text-black" />}
          </div>
        </button>
      </div>

      <BottomNav />
    </main>
  );
}
