"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
const AGE_VERIFIED_KEY = "cannalog_age_verified";
const AGE_REJECTED_KEY = "cannalog_age_rejected";
const AGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const AGE_VERIFIED_COOKIE = "greenlog_age_verified";
const AGE_REJECTED_COOKIE = "greenlog_age_rejected";

interface AgeGateProps {
  onVerified: () => void;
}

export function buildAgeCookie(name: string, value: string, secure: boolean): string {
  return [
    `${name}=${value}`,
    `Max-Age=${AGE_COOKIE_MAX_AGE_SECONDS}`,
    "Path=/",
    "SameSite=Lax",
    secure ? "Secure" : null,
  ].filter(Boolean).join("; ");
}

function setAgeCookie(name: string, value: string) {
  document.cookie = buildAgeCookie(name, value, window.location.protocol === "https:");
}

export function AgeGate({ onVerified }: AgeGateProps) {
  const [birthYear, setBirthYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  useEffect(() => {
    // If already verified, skip
    if (localStorage.getItem(AGE_VERIFIED_KEY) === "true") {
      setAgeCookie(AGE_VERIFIED_COOKIE, "true");
      onVerified();
      return;
    }
    // If rejected, redirect immediately
    if (localStorage.getItem(AGE_REJECTED_KEY) === "true") {
      router.push("/age-gate-rejected");
      return;
    }
  }, [onVerified, router]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const handleVerify = () => {
    const year = parseInt(birthYear, 10);

    if (!year || isNaN(year)) {
      setError("Bitte wähle dein Geburtsjahr.");
      return;
    }

    const age = currentYear - year;

    if (age >= 18) {
      localStorage.setItem(AGE_VERIFIED_KEY, "true");
      setAgeCookie(AGE_VERIFIED_COOKIE, "true");
      onVerified();
      router.replace(nextPath);
    } else {
      localStorage.setItem(AGE_REJECTED_KEY, "true");
      setAgeCookie(AGE_REJECTED_COOKIE, "true");
      router.push("/age-gate-rejected");
    }
  };

  const handleReject = () => {
    localStorage.setItem(AGE_REJECTED_KEY, "true");
    setAgeCookie(AGE_REJECTED_COOKIE, "true");
    router.push("/age-gate-rejected");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0a]/95 backdrop-blur-md p-4">
      <Card className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] p-8 relative overflow-hidden">
        {/* Neon accent */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#00F5FF]/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#2FF801]/5 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 text-center space-y-6">
          {/* Logo */}
          <img src="/logo.webp" alt="GreenLog" className="w-32 h-32 mx-auto mb-4 object-contain drop-shadow-2xl" />

          <div className="space-y-2">
            <h1 className="text-2xl font-black uppercase italic tracking-tight font-display text-[var(--foreground)]">
              GreenLog
            </h1>
            <p className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest font-semibold">
              Altersverifikation
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
              GreenLog richtet sich an Personen ab 18 Jahren. Bitte bestätige dein Alter.
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">
                Geburtsjahr
              </label>
              <select
                value={birthYear}
                onChange={(e) => {
                  setBirthYear(e.target.value);
                  setError(null);
                }}
                className="w-full bg-[var(--input)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] focus:border-[#00F5FF]/50 outline-none cursor-pointer"
              >
                <option value="">— Bitte wählen —</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-xs text-red-400 font-semibold">{error}</p>
            )}

            <button
              onClick={handleVerify}
              className="w-full py-3 bg-[#2FF801] text-black font-black rounded-xl text-sm uppercase tracking-widest hover:bg-[#2FF801]/90 transition-all active:scale-[0.98]"
            >
              Alter bestätigen
            </button>

            <button
              onClick={handleReject}
              className="w-full py-2 text-[var(--muted-foreground)] text-xs uppercase tracking-widest hover:text-red-400 transition-colors"
            >
              Nein, ich bin jünger
            </button>
          </div>

          <p className="text-[9px] text-[var(--muted-foreground)]/60 leading-relaxed">
            Mit der Nutzung von GreenLog bestätigst du, dass du das gesetzliche Mindestalter für den Umgang mit Cannabis-Produkten in deinem Land erreicht hast.
          </p>
        </div>
      </Card>
    </div>
  );
}

// Hook to check age verification (call in pages that need protection)
export function useAgeVerified() {
  const [verified, setVerified] = useState<boolean | null>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AGE_VERIFIED_KEY);
      setTimeout(() => setVerified(stored === "true"), 0);
    } catch {
      setTimeout(() => setVerified(true), 0);
    }
  }, []);

  const markVerified = () => {
    localStorage.setItem(AGE_VERIFIED_KEY, "true");
    setVerified(true);
  };

  return { verified, markVerified };
}

// Server-safe age check for redirects
export function isAgeVerified(): boolean {
  if (typeof window === "undefined") return true; // SSR: allow rendering
  return localStorage.getItem(AGE_VERIFIED_KEY) === "true";
}
