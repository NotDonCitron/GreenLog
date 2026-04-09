"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AgeGate, useAgeVerified } from "@/components/age-gate";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { verified: ageVerified } = useAgeVerified();
  const router = useRouter();

  useEffect(() => {
    if (ageVerified) {
      router.replace("/sign-in");
    }
  }, [ageVerified, router]);

  if (ageVerified === null) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
          <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-[0.2em]">Lade...</p>
        </div>
      </main>
    );
  }

  if (!ageVerified) {
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
