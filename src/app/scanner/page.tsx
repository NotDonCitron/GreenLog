"use client";

import { useState, useRef, useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { X, Zap, Image as ImageIcon, Camera, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createWorker } from "tesseract.js";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ScannerPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"idle" | "capturing" | "processing" | "success" | "error">("idle");
  const [result, setResult] = useState<string | null>(null);
  const [debugText, setDebugText] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const workerRef = useRef<any>(null);

  useEffect(() => {
    async function initWorker() {
      try {
        const worker = await createWorker('deu+eng');
        workerRef.current = worker;
        console.log("OCR Worker bereit");
      } catch (err) {
        console.error("OCR Worker Fehler:", err);
      }
    }
    initWorker();
    return () => { if (workerRef.current) workerRef.current.terminate(); };
  }, []);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        setStatus("error");
        setResult("Kamera-Fehler");
      }
    }
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const findBestMatch = (text: string, strains: any[]) => {
    const lowerText = text.toLowerCase();
    let bestStrain = null;
    let highestScore = 0;

    for (const strain of strains) {
      const name = (strain.name as string).toLowerCase();
      const nameWords = name.split(/[\s,.\-\n]+/).filter((w: string) => w.length > 2);

      let score = 0;

      const fullRegex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (fullRegex.test(lowerText)) {
        score += 15;
      }

      for (const word of nameWords) {
        const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (wordRegex.test(lowerText)) {
          score += 5;
        }
      }

      if (score > highestScore && score >= 5) {
        highestScore = score;
        bestStrain = strain;
      }
    }

    return bestStrain;
  };

  const captureAndRecognize = async () => {
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
      if (!worker) worker = await createWorker('deu+eng');

      const { data: { text } } = await worker.recognize(canvas);
      console.log("Erkannter Text:", text);

      const { data: allStrains } = await supabase.from("strains").select("*");
      const matchedStrain = findBestMatch(text, allStrains || []);

      if (matchedStrain) {
        setResult(matchedStrain.name);
        setStatus("success");
        setTimeout(() => router.push(`/strains/${matchedStrain.slug}`), 2000);
      } else {
        setStatus("error");
        setResult("Nicht gefunden");
        setDebugText(text.slice(0, 60).replace(/\n/g, ' ') + "...");
        setTimeout(() => { setStatus("idle"); setDebugText(null); }, 5000);
      }
    } catch (err) {
      setStatus("error");
      setResult("Fehler");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <main className="h-[100dvh] bg-[var(--background)] text-[var(--foreground)] relative overflow-hidden flex flex-col">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#00F5FF]/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[40%] bg-[#2FF801]/8 blur-[120px] rounded-full" />
      </div>

      <div className="flex-1 relative z-10 flex items-center justify-center overflow-hidden">
        <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover transition-opacity duration-1000 ${cameraActive ? "opacity-100" : "opacity-0"}`} />

        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 pointer-events-none">
          <div className="w-full aspect-square max-w-sm border-2 border-[#00F5FF]/20 rounded-3xl relative">
            {/* Neon corner accents */}
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

      <div className="p-6 pb-28 flex flex-col items-center gap-4 bg-gradient-to-t from-[#0e0e0f] via-[#0e0e0f]/90 to-transparent z-20 shrink-0">
        <div className="text-center space-y-1">
          <h2 className="text-xs font-black tracking-[0.3em] uppercase text-[#00F5FF]">
            {status === "processing" ? "Analysiere..." : "Smart Scanner"}
          </h2>
          <p className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-widest font-bold">
            {status === "error" ? result : "Ziele auf den Namen der Sorte"}
          </p>
          {debugText && (
            <p className="text-[8px] text-[#ff716c] font-mono mt-1 bg-[var(--card)] px-2 py-0.5 rounded">Gelesen: {debugText}</p>
          )}
        </div>

        <button
          onClick={captureAndRecognize}
          disabled={status === "processing" || status === "success"}
          className={`w-16 h-16 rounded-full border-4 border-[#00F5FF]/30 p-1 bg-[var(--card)] transition-all active:scale-95 ${status === "processing" ? "opacity-20" : "opacity-100"}`}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00F5FF] to-[#2FF801] flex items-center justify-center shadow-lg shadow-[#00F5FF]/30">
            <Camera size={28} className="text-black" />
          </div>
        </button>
      </div>

      <BottomNav />
    </main>
  );
}
