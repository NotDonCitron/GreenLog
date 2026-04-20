import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import { PublicProfilePreviewCard } from "./public-profile-preview-card";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("PublicProfilePreviewCard", () => {
  it("shows only profile info until the privacy card is expanded", () => {
    render(
      <PublicProfilePreviewCard profile={profileFixture} disabled={false} onPreferenceChange={vi.fn()} />
    );

    expect(screen.getByText("Dein öffentliches Profil")).toBeTruthy();
    expect(screen.getByText("So sehen andere dein Profil.")).toBeTruthy();
    expect(screen.getByText("Profilinfo")).toBeTruthy();
    expect(screen.queryByText("Abzeichen")).toBeNull();
    expect(screen.queryByText("Favoriten")).toBeNull();
    expect(screen.queryByRole("switch", { name: /Follower-Zahlen/i })).toBeNull();
    expect(screen.getByText(/Versorgung, Mengen, Dosis, Charge, Apotheke und Notizen bleiben privat/i)).toBeTruthy();
    expect(screen.queryByText("Öffentliche Lieblingsstrains ohne Bestand, Charge oder Apotheke.")).toBeNull();
  });

  it("can expand the remaining privacy controls", () => {
    render(
      <PublicProfilePreviewCard profile={profileFixture} disabled={false} onPreferenceChange={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: /Details anzeigen/i }));

    expect(screen.getByText("Abzeichen")).toBeTruthy();
    expect(screen.getByText("Favoriten")).toBeTruthy();
    expect(screen.getByRole("switch", { name: /Follower-Zahlen/i })).toBeTruthy();
    expect(screen.getByText("Öffentliche Lieblingsstrains ohne Bestand, Charge oder Apotheke.")).toBeTruthy();
  });

  it("calls onPreferenceChange when a configurable block is toggled", () => {
    const onPreferenceChange = vi.fn();

    render(
      <PublicProfilePreviewCard
        profile={profileFixture}
        disabled={false}
        onPreferenceChange={onPreferenceChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Details anzeigen/i }));
    fireEvent.click(screen.getByRole("switch", { name: /Favoriten/i }));

    expect(onPreferenceChange).toHaveBeenCalledWith("show_favorites", true);
  });

  it("allows follower counts to be toggled separately", () => {
    const onPreferenceChange = vi.fn();

    render(
      <PublicProfilePreviewCard
        profile={profileFixture}
        disabled={false}
        onPreferenceChange={onPreferenceChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Details anzeigen/i }));
    fireEvent.click(screen.getByRole("switch", { name: /Follower-Zahlen/i }));

    expect(onPreferenceChange).toHaveBeenCalledWith("show_follow_counts", false);
  });

  it("positions switch knobs left when off and right when on", () => {
    render(
      <PublicProfilePreviewCard profile={profileFixture} disabled={false} onPreferenceChange={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: /Details anzeigen/i }));

    const favoriteKnob = screen.getByRole("switch", { name: /Favoriten/i }).querySelector("span");
    const badgeKnob = screen.getByRole("switch", { name: /Abzeichen/i }).querySelector("span");

    expect(favoriteKnob?.className).toContain("left-0");
    expect(favoriteKnob?.className).toContain("translate-x-0.5");
    expect(badgeKnob?.className).toContain("left-0");
    expect(badgeKnob?.className).toContain("translate-x-5");
  });
});

const profileFixture = {
  identity: {
    email: null,
    username: "@greenleaf",
    displayName: "Green Leaf",
    initials: "GL",
    avatarUrl: null,
    profileVisibility: "private",
    tagline: "",
    bio: "Still private",
  },
  stats: {
    totalStrains: 12,
    totalGrows: 2,
    favoriteCount: 4,
    unlockedBadgeCount: 3,
    xp: 250,
    level: 3,
    progressToNextLevel: 50,
    followers: 8,
    following: 14,
  },
  publicPreferences: {
    user_id: "user-1",
    show_badges: true,
    show_favorites: false,
    show_tried_strains: false,
    show_reviews: false,
    show_activity_feed: false,
    show_follow_counts: true,
    default_review_public: false,
  },
  publicBlocks: [
    { key: "profile", label: "Profilinfo", state: "public", description: "Username, Avatar, Anzeigename und Bio." },
    { key: "badges", label: "Abzeichen", state: "public", description: "Freigeschaltete Badges ohne private Konsumdaten." },
    { key: "favorites", label: "Favoriten", state: "private", description: "Öffentliche Lieblingsstrains ohne Bestand, Charge oder Apotheke." },
    { key: "activity", label: "Aktivität", state: "private", description: "Nur aus öffentlichen Aktionen erzeugte Aktivitäten." },
  ],
};
