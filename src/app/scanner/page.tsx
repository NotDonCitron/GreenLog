"use client";

import { useState, useRef, useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { X, Zap, Image as ImageIcon, Camera, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createWorker } from "tesseract.js";
import { useRouter } from "next/navigation";

export default function ScannerPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"idle" | "capturing" | "processing" | "success" | "error">("idle");
  const [result, setResult] = useState<any>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const workerRef = useRef<any>(null);

  // Levenshtein Distanz für Fuzzy Search
  const getLevenshteinDistance = (a: string, b: string) => {
    const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[a.length][b.length];
  };

  const findBestMatch = (text: string, strains: any[]) => {
    const words = text.toLowerCase().split(/[\s,.\-\n]+/);
    let bestMatch = null;
    let minDistance = 4; // Toleranz für längere Namen

    for (const strain of strains) {
      const name = strain.name.toLowerCase();
      
      // 1. Direkter Treffer
      if (text.toLowerCase().includes(name)) return strain;

      // 2. Fuzzy Match auf Wort-Ebene
      for (const word of words) {
        if (word.length < 4) continue;
        const dist = getLevenshteinDistance(word, name);
        if (dist <= 2 && dist < minDistance) {
          minDistance = dist;
          bestMatch = strain;
        }
      }
    }
    return bestMatch;
  };

  // Initialisiere OCR Worker im Hintergrund
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

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Kamera starten
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" },
          audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.error("Kamerafehler:", err);
        setStatus("error");
        setResult("Kamerazugriff verweigert.");
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

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setStatus("capturing");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Screenshot vom Video-Feed machen
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    setStatus("processing");
    
    try {
      let worker = workerRef.current;
      
      // Fallback falls Worker noch nicht bereit
      if (!worker) {
        worker = await createWorker('deu+eng');
      }

      const { data: { text } } = await worker.recognize(canvas);
      
      if (!workerRef.current) {
        await worker.terminate();
      }

      console.log("Erkannter Text:", text);

      // Alle Strains für Abgleich laden
      const { data: allStrains, error: fetchError } = await supabase
        .from("strains")
        .select("*");

      if (fetchError) throw fetchError;

      const matchedStrain = findBestMatch(text, allStrains || []);

      if (matchedStrain) {
        console.log("Strain erkannt:", matchedStrain.name);
        setResult(matchedStrain.name);
        setStatus("success");
        
        // Nach 2 Sekunden zur Detailseite weiterleiten
        setTimeout(() => {
          router.push(`/strains/${matchedStrain.slug}`);
        }, 2000);
      } else {
        console.warn("Keine Sorte erkannt");
        setStatus("error");
        setResult("Keine Sorte erkannt. Bitte versuche es erneut.");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch (err: any) {
      console.error("Scanner Fehler:", err);
      setStatus("error");
      setResult("Fehler beim Scannen.");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col">
      {/* Camera Viewport */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className={`w-full h-full object-cover transition-opacity duration-1000 ${cameraActive ? "opacity-100" : "opacity-0"}`} 
        />
        
        {/* Scanner Overlay UI */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 pointer-events-none">
          <div className="w-full aspect-square max-w-sm border-2 border-white/20 rounded-3xl relative">
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-[#00F5FF] rounded-tl-3xl" />
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-[#00F5FF] rounded-tr-3xl" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-[#00F5FF] rounded-bl-3xl" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-[#00F5FF] rounded-br-3xl" />
            
            {status === "processing" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-3xl">
                <Loader2 className="animate-spin text-[#00F5FF]" size={48} />
              </div>
            )}

            {status === "success" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#2FF801]/20 backdrop-blur-sm rounded-3xl animate-in zoom-in">
                <CheckCircle2 className="text-[#2FF801]" size={64} />
                <p className="mt-4 font-bold text-[#2FF801] uppercase tracking-widest">{result}</p>
              </div>
            )}
          </div>

          {/* Versteckter Canvas für OCR */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>

      {/* Bottom Instructions */}
      <div className="p-12 pb-32 flex flex-col items-center gap-6 bg-gradient-to-t from-black via-black/80 to-transparent z-10">
        <div className="text-center space-y-2">
          <h2 className="text-sm font-bold tracking-[0.3em] uppercase text-[#00F5FF]">
            {status === "processing" ? "Analysiere Text..." : "Smart Scanner"}
          </h2>
          <p className="text-xs text-white/40 uppercase tracking-widest leading-relaxed">
            {status === "error" ? result : "Scanne das Etikett deiner Sorte"}
          </p>
        </div>

        {/* Shutter Button */}
        <button 
          onClick={captureAndRecognize}
          disabled={status === "processing" || status === "success"}
          className={`w-20 h-20 rounded-full border-4 border-white/10 p-1 bg-white/5 transition-all active:scale-95 ${status === "processing" ? "opacity-20" : "opacity-100"}`}
        >
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.4)]">
            <Camera size={32} className="text-black" />
          </div>
        </button>
      </div>

      <BottomNav />
    </main>
  );
}
