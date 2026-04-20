import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

import { PublicProfilePreviewCard } from "./public-profile-preview-card";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("PublicProfilePreviewCard", () => {
  it("shows public and private blocks and the private-data warning", () => {
    render(
      <PublicProfilePreviewCard
        profile={{
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
        }}
      />
    );

    expect(screen.getByText("Öffentliche Vorschau")).toBeTruthy();
    expect(screen.getByText("Profilinfo")).toBeTruthy();
    expect(screen.getByText("Abzeichen")).toBeTruthy();
    expect(screen.getByText("Favoriten")).toBeTruthy();
    expect(screen.getAllByText("Privat")).toHaveLength(2);
    expect(screen.getByText(/Private Daten bleiben privat/i)).toBeTruthy();
  });
});
