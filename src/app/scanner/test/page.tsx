"use client";

import { useState, useRef, useCallback } from "react";
import { ChevronLeft, Upload, Loader2, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

const TEST_LABELS = [
  { name: "GODFATHER OG", charge: "BATCH-88291", thc: "31.4%" },
  { name: "ANIMAL FACE", charge: "BATCH-44102", thc: "28.5%" },
  { name: "GMO COOKIES", charge: "BATCH-11920", thc: "30.1%" },
  { name: "GELATO 33", charge: "BATCH-22031", thc: "24.2%" },
  { name: "SOUR DIESEL", charge: "BATCH-99381", thc: "21.0%" },
];

type UploadStatus = "idle" | "loading" | "success" | "error";

export default function ScannerTestPage() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    setUploadStatus("loading");
    setOcrResult(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("deu+eng");

      // Create canvas for image processing
      const img = new window.Image();
      img.src = url;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });

      const canvas = window.document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = img.width;
      canvas.height = img.height;

      // Apply contrast enhancement for better OCR
      ctx.filter = "contrast(1.3) brightness(1.1)";
      ctx.drawImage(img, 0, 0);
      ctx.filter = "none";

      const { data: { text } } = await worker.recognize(canvas);
      await worker.terminate();

      setOcrResult(text.trim());
      setUploadStatus(text.trim() ? "success" : "error");
    } catch (err) {
      console.error("OCR error:", err);
      setUploadStatus("error");
      setOcrResult("Fehler bei der Texterkennung.");
    }
  }, []);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) return;
    void processImage(file);
  }, [processImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    void handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const clearUpload = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setOcrResult(null);
    setUploadStatus("idle");
  }, [previewUrl]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-8 pb-20">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00F5FF]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#2FF801]/5 blur-[80px] rounded-full" />
      </div>

      <div className="max-w-2xl mx-auto space-y-12 relative z-10">
        <div className="flex items-center gap-4 border-b border-[var(--border)]/50 pb-6">
          <Link href="/scanner" className="p-2 hover:bg-[var(--card)] rounded-full transition-all">
            <ChevronLeft size={24} className="text-[var(--foreground)]" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-[var(--foreground)]">Scanner Test-Zentrum</h1>
            <p className="text-[var(--muted-foreground)] text-sm">Teste die Texterkennung mit eigenen Bildern.</p>
          </div>
        </div>

        {/* Image Upload Section */}
        <section className="space-y-4">
          <h2 className="text-xs font-black text-[#00F5FF] uppercase tracking-widest">Bild-Upload Test</h2>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => void handleFileSelect(e.target.files)}
            className="hidden"
          />

          {!previewUrl ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-[#00F5FF] bg-[#00F5FF]/10"
                  : "border-[var(--border)] hover:border-[#00F5FF]/50 bg-[var(--card)]"
              }`}
            >
              <div className="flex flex-col items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  isDragging ? "bg-[#00F5FF]/20" : "bg-[var(--muted)]"
                }`}>
                  <Upload size={28} className={isDragging ? "text-[#00F5FF]" : "text-[var(--muted-foreground)]"} />
                </div>
                <div>
                  <p className="font-bold text-[var(--foreground)]">Bild hochladen</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Drag & Drop oder klicken — alle Bildformate
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative rounded-3xl overflow-hidden border border-[var(--border)] bg-[var(--card)]">
                <img
                  src={previewUrl}
                  alt="Upload Preview"
                  className="w-full max-h-80 object-contain"
                />

                {/* Status overlay */}
                {uploadStatus === "loading" && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                    <Loader2 size={32} className="text-[#00F5FF] animate-spin" />
                    <p className="text-xs font-bold text-white uppercase tracking-widest">Analysiere...</p>
                  </div>
                )}

                {uploadStatus === "success" && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 size={28} className="text-[#2FF801]" />
                  </div>
                )}

                {uploadStatus === "error" && (
                  <div className="absolute top-3 right-3">
                    <XCircle size={28} className="text-[#ff716c]" />
                  </div>
                )}

                {/* Clear button */}
                <button
                  onClick={clearUpload}
                  className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                  aria-label="Bild entfernen"
                >
                  <XCircle size={18} className="text-white" />
                </button>
              </div>

              {/* OCR Result */}
              {ocrResult && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={14} className="text-[#00F5FF]" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-[var(--foreground)]">Erkannter Text</h3>
                  </div>
                  <pre className="text-sm font-mono text-[var(--foreground)]/80 whitespace-pre-wrap bg-black/20 rounded-xl p-3 max-h-40 overflow-auto">
                    {ocrResult || "(Kein Text erkannt)"}
                  </pre>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Static Test Labels */}
        <section className="space-y-4">
          <h2 className="text-xs font-black text-[#00F5FF] uppercase tracking-widest">Druckbare Test-Etiketten</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            Scanne diese Etiketten mit der Kamera-Funktion für echten OCR-Test.
          </p>

          <div className="grid gap-12">
            {TEST_LABELS.map((label) => (
              <div key={label.name} className="space-y-4">
                <h2 className="text-xs font-black text-[#00F5FF] uppercase tracking-widest">Test-Etikett für {label.name}</h2>
                <div className="border-4 border-[#00F5FF]/30 p-8 bg-[var(--card)] shadow-sm flex flex-col items-center text-center space-y-4 rounded-3xl">
                  <div className="w-full border-b-2 border-[var(--border)]/50 pb-4 mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">Apotheken-Zertifikat</p>
                  </div>
                  <p className="text-sm font-mono text-[var(--muted-foreground)]">{label.charge}</p>
                  <h3 className="text-5xl font-black italic tracking-tighter font-display text-[var(--foreground)]">{label.name}</h3>
                  <div className="flex gap-8 pt-4">
                    <div className="text-center">
                      <p className="text-[8px] font-bold uppercase text-[var(--muted-foreground)]">Potenz</p>
                      <p className="text-xl font-bold text-[#2FF801]">{label.thc} THC</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-bold uppercase text-[var(--muted-foreground)]">Menge</p>
                      <p className="text-xl font-bold text-[var(--foreground)]">15.0g</p>
                    </div>
                  </div>
                  <div className="w-full border-t-2 border-[var(--border)]/50 pt-4 mt-2">
                    <p className="text-[8px] font-bold uppercase text-[#484849]">Gescannt mit CANNALOG v1.0</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--card)] border-t border-[var(--border)]/50 text-center text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
        Hinweis: Diese Seite dient nur zu Testzwecken der OCR-Erkennung.
      </div>
    </main>
  );
}
