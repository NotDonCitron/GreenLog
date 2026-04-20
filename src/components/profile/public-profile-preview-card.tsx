"use client";

import Link from "next/link";
import { Check, Eye, Lock, Shield } from "lucide-react";

import type { ProfileViewModel } from "@/lib/types";
import { cn } from "@/lib/utils";

type PublicProfilePreviewCardProps = {
  profile: Pick<ProfileViewModel, "identity" | "publicPreferences" | "publicBlocks">;
};

function formatStateLabel(state: "public" | "private") {
  return state === "public" ? "Öffentlich" : "Privat";
}

export function PublicProfilePreviewCard({ profile }: PublicProfilePreviewCardProps) {
  const username = profile.identity.username.replace(/^@/, "");
  const publicBlocks = profile.publicBlocks;
  const visibleBlocks = publicBlocks.filter((block) => block.state === "public").length;
  const hiddenBlocks = publicBlocks.length - visibleBlocks;

  return (
    <section
      aria-labelledby="public-profile-preview-title"
      className="rounded-lg border border-[var(--border)]/50 bg-[var(--card)] p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#2FF801]/25 bg-[#2FF801]/10 text-[#2FF801]">
          <Shield size={18} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="public-profile-preview-title" className="text-sm font-black uppercase tracking-[0.18em] text-[var(--foreground)]">
              Öffentliche Vorschau
            </h2>
            <span className="rounded-md border border-[#2FF801]/25 bg-[#2FF801]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2FF801]">
              {visibleBlocks} sichtbar
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
            So sieht dein Profil für andere aus. Private Daten bleiben privat.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {publicBlocks.map((block) => (
          <div
            key={block.key}
            className={cn(
              "rounded-lg border px-3 py-2",
              block.state === "public"
                ? "border-[#2FF801]/25 bg-[#2FF801]/5"
                : "border-[var(--border)]/50 bg-[var(--background)]"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--foreground)]">
                {block.label}
              </p>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]",
                  block.state === "public"
                    ? "bg-[#2FF801]/10 text-[#2FF801]"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                )}
              >
                {block.state === "public" ? <Check size={10} /> : <Lock size={10} />}
                {formatStateLabel(block.state)}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
              {block.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)]/50 bg-[var(--background)] px-3 py-2">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-[#2FF801]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            {profile.publicPreferences.show_follow_counts ? "Follower-Zahlen sichtbar" : "Follower-Zahlen verborgen"}
          </p>
        </div>
        <p className="text-[11px] text-[var(--muted-foreground)]">
          {hiddenBlocks} Bereiche bleiben privat
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={`/user/${username}`}
          className="inline-flex items-center gap-2 rounded-md border border-[#2FF801]/25 bg-[#2FF801] px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#2FF801]/90"
        >
          Öffentliche Seite ansehen
        </Link>
      </div>
    </section>
  );
}
