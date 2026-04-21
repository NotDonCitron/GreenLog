"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AgeGate, useAgeVerified } from "@/components/age-gate";
import { Loader2 } from "lucide-react";

const AGE_VERIFIED_COOKIE = "greenlog_age_verified=true";

function hasVerifiedAgeCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((entry) => entry.trim() === AGE_VERIFIED_COOKIE);
}

export default function LoginPage() {
  const { verified: ageVerified } = useAgeVerified();
  const router = useRouter();
  const isAgeVerified = ageVerified || hasVerifiedAgeCookie();

  useEffect(() => {
    if (isAgeVerified) {
      router.replace("/sign-in");
    }
  }, [isAgeVerified, router]);

  if (ageVerified === null && !isAgeVerified) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
          <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-[0.2em]">Lade...</p>
        </div>
      </main>
    );
  }

  if (!isAgeVerified) {
    return <AgeGate onVerified={() => {}} />;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
        <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-[0.2em]">Weiterleitung...</p>
      </div>
    </main>
  );
}
