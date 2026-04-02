"use client";

import { Suspense } from "react";
import { ComparePageContent } from "./compare-page-content";

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-20">
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
          </div>
          <div className="sticky top-0 z-50 glass-surface border-b border-[var(--border)]/50 px-6 pt-12 pb-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--card)] border border-[var(--border)]/50 animate-pulse" />
                <div>
                  <div className="h-6 w-32 bg-[var(--card)] border border-[var(--border)]/50 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-[#00F5FF] border-t-transparent rounded-full animate-spin" />
          </div>
        </main>
      }
    >
      <ComparePageContent />
    </Suspense>
  );
}
