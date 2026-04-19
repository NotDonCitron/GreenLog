'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { isChunkLoadError } from '@/lib/chunk-load-error';

export default function GlobalError({
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

    console.error('[GlobalError]', error);
  }, [error, reset]);

  if (isChunkLoadError(error)) {
    return (
      <html lang="de" className="h-full">
        <body className="h-full bg-[#0e0e0f] text-white font-body antialiased" />
      </html>
    );
  }

  return (
    <html lang="de" className="h-full">
      <body className="h-full bg-[#0e0e0f] text-white font-body antialiased overflow-hidden">
        <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6">
          {/* Neon glow icon */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-[#1a191b] border border-[#00F5FF]/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,245,255,0.15)]">
              <span className="text-4xl" role="img" aria-label="Fehler">⚠️</span>
            </div>
            <div className="absolute inset-0 rounded-full bg-[#00F5FF]/10 blur-xl animate-pulse" />
          </div>

          {/* Error message */}
          <div className="text-center space-y-3 max-w-md">
            <h1 className="text-3xl font-black italic tracking-tighter font-display text-[#00F5FF]">
              System Error
            </h1>
            <p className="text-[#adaaab] text-sm">
              Ein unerwarteter Fehler ist aufgetreten.
              {error.digest && (
                <> Reference: <code className="text-[#00F5FF] font-mono text-xs bg-[#1a191b] px-2 py-0.5 rounded">{error.digest}</code></>
              )}
            </p>
            {process.env.NODE_ENV === 'development' && error.message && (
              <details className="text-left mt-4">
                <summary className="text-[#ff716c] text-xs font-mono cursor-pointer hover:text-[#ff716c]/80">
                  Error Details (Dev only)
                </summary>
                <pre className="text-[#ff716c] text-xs font-mono bg-[#1a191b] rounded p-3 mt-2 max-w-lg overflow-auto">
                  {error.message}
                  {error.stack && error.stack.split('\n').slice(0, 5).map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
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

          {/* Footer */}
          <p className="text-[#484849] text-xs font-mono">
            CannaLog v2.0 — Neon Vault Edition
          </p>
        </div>
      </body>
    </html>
  );
}
