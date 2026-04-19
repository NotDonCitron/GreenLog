import { render, screen } from "@testing-library/react";
import ProfilePage from "./profile-view";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/components/auth-provider";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// Mock dependencies
vi.mock("@/components/toast-provider", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("@/hooks/useProfile", () => ({
  useProfile: vi.fn(),
}));

vi.mock("@/components/auth-provider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/components/bottom-nav", () => ({
  BottomNav: () => <div data-testid="bottom-nav">BottomNav</div>,
}));

vi.mock("@/components/organization-switcher", () => ({
  OrganizationSwitcher: () => <div data-testid="org-switcher">OrgSwitcher</div>,
}));

vi.mock("@/components/social/followers-list-modal", () => ({
  FollowersListModal: () => null,
}));

vi.mock("@/components/social/avatar-upload", () => ({
  AvatarUpload: () => <div data-testid="avatar-upload">AvatarUpload</div>,
}));

vi.mock("@/components/notifications/notification-bell", () => ({
  NotificationBell: () => null,
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("ProfileView component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading spinner when loading", () => {
    (useAuth as any).mockReturnValue({
      user: { id: "123" },
      loading: false,
      isDemoMode: false,
    });
    (useProfile as any).mockReturnValue({
      data: null,
      isLoading: true,
    });

    render(<ProfilePage />);
    // The loader has animate-spin class
    const loader = document.querySelector(".animate-spin");
    expect(loader).toBeTruthy();
  });

  it("should show locked state when not logged in", () => {
    (useAuth as any).mockReturnValue({
      user: null,
      loading: false,
      isDemoMode: false,
    });
    (useProfile as any).mockReturnValue({
      data: null,
      isLoading: false,
    });

    render(<ProfilePage />);
    expect(screen.getByText(/Profil gesperrt/i)).toBeTruthy();
    expect(screen.getByText(/Jetzt Anmelden/i)).toBeTruthy();
  });

  it("should render profile data correctly", () => {
    const mockProfileData = {
      identity: {
        username: "@testuser",
        displayName: "Test User",
        initials: "TU",
        avatarUrl: null,
        profileVisibility: "public",
        tagline: "",
        bio: "This is a test bio",
      },
      stats: {
        totalStrains: 42,
        totalGrows: 5,
        favoriteCount: 3,
        unlockedBadgeCount: 2,
        xp: 100,
        level: 2,
        progressToNextLevel: 50,
        followers: 10,
        following: 20,
      },
      favorites: [],
      badges: [],
      featuredBadgeIds: [],
      activity: [],
    };

    (useAuth as any).mockReturnValue({
      user: { id: "123" },
      loading: false,
      isDemoMode: false,
    });
    (useProfile as any).mockReturnValue({
      data: mockProfileData,
      isLoading: false,
    });

    render(<ProfilePage />);

    expect(screen.getByText("Test User")).toBeTruthy();
    expect(screen.getByText("@testuser")).toBeTruthy();
    expect(screen.getByText("This is a test bio")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy(); // Strains count
    expect(screen.getByText("10")).toBeTruthy(); // Followers count
    expect(screen.getByText("20")).toBeTruthy(); // Following count
  });

  it("should render the selected featured badges on the profile", () => {
    const mockProfileData = {
      identity: {
        username: "@testuser",
        displayName: "Test User",
        initials: "TU",
        avatarUrl: null,
        profileVisibility: "public",
        tagline: "",
        bio: null,
      },
      stats: {
        totalStrains: 42,
        totalGrows: 5,
        favoriteCount: 3,
        unlockedBadgeCount: 2,
        xp: 100,
        level: 2,
        progressToNextLevel: 50,
        followers: 10,
        following: 20,
      },
      favorites: [],
      badges: [
        {
          id: "first-strain",
          name: "Greenie",
          description: "1 Strain gesammelt",
          iconKey: "trophy",
          rarity: "common",
        },
        {
          id: "collector-10",
          name: "Sammler",
          description: "10 Strains gesammelt",
          iconKey: "leaf",
          rarity: "common",
        },
      ],
      featuredBadgeIds: ["collector-10", "first-strain"],
      activity: [],
    };

    (useAuth as any).mockReturnValue({
      user: { id: "123" },
      loading: false,
      isDemoMode: false,
    });
    (useProfile as any).mockReturnValue({
      data: mockProfileData,
      isLoading: false,
    });

    render(<ProfilePage />);

    expect(screen.getByText("Sammler")).toBeTruthy();
    expect(screen.getByText("Greenie")).toBeTruthy();
  });
});
