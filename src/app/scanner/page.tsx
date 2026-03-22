"use client";

import { useState, useRef, useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { X, Zap, Image as ImageIcon, Camera, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createWorker } from "tesseract.js";
import { supabase } from "@/lib/supabase";

export default function ScannerPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<"idle" | "capturing" | "processing" | "success" | "error">("idle");
  const [result, setResult] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

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
      // OCR Prozess starten
      const worker = await createWorker('deu+eng');
      const { data: { text } } = await worker.recognize(canvas);
      await worker.terminate();

      console.log("Erkannter Text:", text);
      
      // Datenbank-Abgleich
      const { data: strains } = await supabase.from("strains").select("name, slug");
      
      const foundStrain = strains?.find(s => 
        text.toLowerCase().includes(s.name.toLowerCase())
      );

      if (foundStrain) {
        setStatus("success");
        setResult(foundStrain.name);
        setTimeout(() => {
          router.push(`/strains/${foundStrain.slug}`);
        }, 1500);
      } else {
        setResult("Keine Sorte erkannt. Versuche es erneut!");
        setStatus("error");
        setTimeout(() => setStatus("idle"), 2000);
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

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
        </div>
      </div>

      {/* Camera Viewport */}
      <div className="flex-1 flex items-center justify-center relative">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
        />
        
        {/* Sucher-Rahmen */}
        <div className={`relative w-72 h-72 transition-all duration-500 ${status === 'processing' ? 'scale-90 opacity-50' : 'scale-100 opacity-100'}`}>
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
