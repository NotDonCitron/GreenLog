import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import UserProfilePage from "./page";
import { useAuth } from "@/components/auth-provider";

vi.mock("next/navigation", () => ({
    useParams: () => ({ username: "testuser" }),
}));

vi.mock("@/components/auth-provider", () => ({
    useAuth: vi.fn(),
}));

vi.mock("@/components/bottom-nav", () => ({
    BottomNav: () => <div data-testid="bottom-nav" />,
}));

vi.mock("@/components/social/follow-button", () => ({
    FollowButton: () => <div data-testid="follow-button" />,
}));

vi.mock("@/components/social/activity-item", () => ({
    ActivityItem: () => <div data-testid="activity-item" />,
}));

vi.mock("@/components/profile/user-collections-tab", () => ({
    UserCollectionsTab: () => <div data-testid="collections-tab" />,
}));

vi.mock("@/lib/supabase/client", () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe("UserProfilePage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as unknown as { mockReturnValue: (value: unknown) => void }).mockReturnValue({
            user: null,
            loading: false,
        });
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                data: {
                    profile: {
                        profile: {
                            id: "user-1",
                            username: "testuser",
                            display_name: "Test User",
                            avatar_url: null,
                            bio: "Public bio",
                            created_at: "2026-04-20T00:00:00.000Z",
                        },
                        preferences: {
                            user_id: "user-1",
                            show_badges: true,
                            show_favorites: true,
                            show_tried_strains: false,
                            show_reviews: true,
                            show_activity_feed: true,
                            show_follow_counts: true,
                            default_review_public: false,
                        },
                        blocks: [],
                        counts: {
                            followers: 12,
                            following: 8,
                            ratings: 3,
                        },
                        badges: [],
                        favorites: [],
                        triedStrains: [],
                        reviews: [],
                        activities: [],
                    },
                },
                error: null,
            }),
        } as Response);
    });

    it("loads public profile data through the public profile API and shows reviews instead of collection tabs", async () => {
        render(<UserProfilePage />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/public-profiles/testuser",
                expect.objectContaining({ signal: expect.any(Object) })
            );
        });

        expect(await screen.findByRole("button", { name: "Reviews" })).toBeTruthy();
        expect(screen.queryByRole("button", { name: "Sammlung" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Grows" })).toBeNull();
    });
});
