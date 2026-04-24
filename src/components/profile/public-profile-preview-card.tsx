"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Eye, Lock, Shield } from "lucide-react";

import type { ProfileViewModel, PublicProfileBlockState, PublicProfilePreferences } from "@/lib/types";
import { cn } from "@/lib/utils";

type PublicProfilePreviewCardProps = {
  profile: Pick<ProfileViewModel, "identity" | "publicPreferences" | "publicBlocks">;
  disabled?: boolean;
  onVisibilityChange?: (value: boolean) => void;
  onPreferenceChange?: (key: PublicProfilePreferenceToggleKey, value: boolean) => void;
};

export type PublicProfilePreferenceToggleKey =
  | "show_badges"
  | "show_favorites"
  | "show_tried_strains"
  | "show_reviews"
  | "show_activity_feed"
  | "show_follow_counts";

const BLOCK_TO_PREFERENCE: Partial<Record<PublicProfileBlockState["key"], PublicProfilePreferenceToggleKey>> = {
  badges: "show_badges",
  favorites: "show_favorites",
  tried_strains: "show_tried_strains",
  reviews: "show_reviews",
  activity: "show_activity_feed",
};

function formatStateLabel(state: "public" | "private") {
  return state === "public" ? "Öffentlich" : "Privat";
}

function getPreferenceValue(preferences: PublicProfilePreferences, key: PublicProfilePreferenceToggleKey) {
  return Boolean(preferences[key]);
}

export function PublicProfilePreviewCard({ profile, disabled = false, onVisibilityChange, onPreferenceChange }: PublicProfilePreviewCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const username = profile.identity.username.replace(/^@/, "");
  const isProfilePublic = profile.identity.profileVisibility === "public";
  const publicBlocks = profile.publicBlocks;
  const displayedBlocks = showDetails
    ? publicBlocks
    : publicBlocks.filter((block) => block.key === "profile");
  const visibleBlocks = publicBlocks.filter((block) => block.state === "public").length;
  const hiddenBlocks = publicBlocks.length - visibleBlocks;

  return (
    <section
      aria-labelledby="public-profile-preview-title"
      className="w-full max-w-full overflow-hidden rounded-lg border border-[var(--border)]/50 bg-[var(--card)] p-4"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2FF801]/25 bg-[#2FF801]/10 text-[#2FF801] sm:h-10 sm:w-10">
          <Shield size={18} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="public-profile-preview-title" className="min-w-0 text-xs font-black uppercase tracking-[0.12em] text-[var(--foreground)] sm:text-sm sm:tracking-[0.18em]">
              Dein öffentliches Profil
            </h2>
            <span className="rounded-md border border-[#2FF801]/25 bg-[#2FF801]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#2FF801] sm:tracking-[0.18em]">
              {visibleBlocks} sichtbar
            </span>
          </div>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            So sehen andere dein Profil.
          </p>
          <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
            Versorgung, Mengen, Dosis, Charge, Apotheke und Notizen bleiben privat.
          </p>
        </div>
      </div>

      <div className="mt-4 flex min-w-0 flex-col gap-3 rounded-lg border border-[var(--border)]/50 bg-[var(--background)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--foreground)] sm:tracking-[0.16em]">
            Profilseite
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
            Muss öffentlich sein, damit dein Link sichtbar ist.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.16em]",
            isProfilePublic ? "text-[#2FF801]" : "text-[var(--muted-foreground)]"
          )}>
            {isProfilePublic ? "Öffentlich" : "Privat"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isProfilePublic}
            aria-label="Profilseite öffentlich anzeigen"
            disabled={disabled || !onVisibilityChange}
            onClick={() => onVisibilityChange?.(!isProfilePublic)}
            className={cn(
              "relative h-6 w-11 rounded-full border border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              isProfilePublic ? "bg-[#2FF801]" : "bg-[var(--muted)]"
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                isProfilePublic ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowDetails((current) => !current)}
        className="mt-4 inline-flex w-full items-center justify-between rounded-lg border border-[var(--border)]/50 bg-[var(--background)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] sm:tracking-[0.16em]"
        aria-expanded={showDetails}
      >
        {showDetails ? "Details ausblenden" : "Details anzeigen"}
        <ChevronDown
          size={14}
          className={cn("transition-transform", showDetails ? "rotate-180" : "rotate-0")}
        />
      </button>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {displayedBlocks.map((block) => {
          const preferenceKey = BLOCK_TO_PREFERENCE[block.key];
          const isConfigurable = Boolean(preferenceKey && onPreferenceChange);
          const checked = preferenceKey
            ? getPreferenceValue(profile.publicPreferences, preferenceKey)
            : block.state === "public";

          return (
            <div
              key={block.key}
              className={cn(
                "min-w-0 rounded-lg border px-3 py-2",
                block.state === "public"
                  ? "border-[#2FF801]/25 bg-[#2FF801]/5"
                  : "border-[var(--border)]/50 bg-[var(--background)]"
              )}
            >
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 text-xs font-bold uppercase tracking-[0.12em] text-[var(--foreground)] sm:tracking-[0.16em]">
                  {block.label}
                </p>
                {isConfigurable && preferenceKey ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.16em]",
                      checked ? "text-[#2FF801]" : "text-[var(--muted-foreground)]"
                    )}>
                      {checked ? "Öffentlich" : "Privat"}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      aria-label={`${block.label} öffentlich anzeigen`}
                      disabled={disabled}
                      onClick={() => onPreferenceChange?.(preferenceKey, !checked)}
                      className={cn(
                        "relative h-6 w-11 rounded-full border border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                        checked ? "bg-[#2FF801]" : "bg-[var(--muted)]"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                          checked ? "translate-x-5" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </div>
                ) : (
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
                )}
              </div>
              {showDetails && (
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                  {block.description}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {showDetails && (
        <>
          <div className="mt-4 flex min-w-0 flex-col gap-3 rounded-lg border border-[var(--border)]/50 bg-[var(--background)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Eye size={14} className="text-[#2FF801]" />
              <p className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)] sm:tracking-[0.16em]">
                {profile.publicPreferences.show_follow_counts ? "Follower-Zahlen sichtbar" : "Follower-Zahlen verborgen"}
              </p>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 sm:justify-end">
              {onPreferenceChange ? (
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.16em]",
                    profile.publicPreferences.show_follow_counts ? "text-[#2FF801]" : "text-[var(--muted-foreground)]"
                  )}>
                    {profile.publicPreferences.show_follow_counts ? "Öffentlich" : "Privat"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={profile.publicPreferences.show_follow_counts}
                    aria-label="Follower-Zahlen öffentlich anzeigen"
                    disabled={disabled}
                    onClick={() => onPreferenceChange("show_follow_counts", !profile.publicPreferences.show_follow_counts)}
                    className={cn(
                      "relative h-6 w-11 rounded-full border border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      profile.publicPreferences.show_follow_counts ? "bg-[#2FF801]" : "bg-[var(--muted)]"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                        profile.publicPreferences.show_follow_counts ? "translate-x-5" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
              ) : null}
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {hiddenBlocks} Bereiche bleiben privat
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href={`/user/${username}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#2FF801]/25 bg-[#2FF801] px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.12em] text-black transition-colors hover:bg-[#2FF801]/90 sm:w-auto sm:tracking-[0.18em]"
            >
              Öffentliche Seite ansehen
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
