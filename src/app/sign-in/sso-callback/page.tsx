"use client";

// Clerk middleware handles the OAuth callback at the edge — this page just renders a loading state
// while Clerk processes the token and redirects to /feed automatically

export default function SSOCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        <p className="text-[var(--foreground)]">Signing you in...</p>
      </div>
    </div>
  );
}
