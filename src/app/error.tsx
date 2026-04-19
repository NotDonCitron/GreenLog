'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { isChunkLoadError } from '@/lib/chunk-load-error';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      const timeout = window.setTimeout(reset, 1000);
      return () => window.clearTimeout(timeout);
    }

    console.error('[Error]', error);
  }, [error, reset]);

  if (isChunkLoadError(error)) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-6 py-16">
      {/* Neon glow icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-[#1a191b] border border-[#00F5FF]/30 flex items-center justify-center shadow-[0_0_25px_rgba(0,245,255,0.15)]">
          <span className="text-3xl" role="img" aria-label="Fehler">⚠️</span>
        </div>
        <div className="absolute inset-0 rounded-full bg-[#00F5FF]/10 blur-xl animate-pulse" />
      </div>

      {/* Error message */}
      <div className="text-center space-y-3 max-w-md">
        <h2 className="text-2xl font-black italic tracking-tighter font-display text-[#00F5FF]">
          Etwas ist schiefgelaufen
        </h2>
        <p className="text-[#adaaab] text-sm">
          Diese Seite konnte nicht geladen werden.
          {error.digest && (
            <> <code className="text-[#00F5FF] font-mono text-xs bg-[#1a191b] px-2 py-0.5 rounded">{error.digest.slice(0, 8)}</code></>
          )}
        </p>
        {process.env.NODE_ENV === 'development' && error.message && (
          <details className="text-left mt-4">
            <summary className="text-[#ff716c] text-xs font-mono cursor-pointer hover:text-[#ff716c]/80">
              Error Details (Dev only)
            </summary>
            <pre className="text-[#ff716c] text-xs font-mono bg-[#1a191b] rounded p-3 mt-2 max-w-lg overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#00F5FF]/80 text-[#004346] font-black font-display hover:shadow-[0_0_25px_rgba(0,245,255,0.4)] transition-all active:scale-95"
        >
          Erneut versuchen
        </button>
        <Link
          href="/"
          className="px-6 py-3 rounded-xl border border-[#484849] text-white font-display hover:border-[#00F5FF]/50 hover:text-[#00F5FF] transition-all flex items-center"
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
