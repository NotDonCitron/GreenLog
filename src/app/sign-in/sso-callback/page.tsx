"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";

export default function SSOCallback() {
  const router = useRouter();

  useEffect(() => {
    // Clerk middleware handles the OAuth callback automatically
    // Redirect to feed after a short delay to let Clerk process the callback
    const timer = setTimeout(() => {
      router.push("/feed");
    }, 1000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        <p className="text-[var(--foreground)]">Signing you in...</p>
      </div>
    </div>
  );
}
