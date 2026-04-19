"use client";

import { Suspense, useState } from "react";
import { AgeGate } from "@/components/age-gate";

function AgeGateContent() {
  const [, setVerified] = useState(false);

  return <AgeGate onVerified={() => setVerified(true)} />;
}

export default function AgeGatePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
        <AgeGateContent />
      </Suspense>
    </main>
  );
}
