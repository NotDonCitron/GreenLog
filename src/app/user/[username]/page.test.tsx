import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
                        badges: [
                            { id: "badge-1", name: "Starter", description: "1 Strain gesammelt", iconKey: "starter", rarity: "common" },
                            { id: "badge-2", name: "Explorer", description: "Unlocked", iconKey: "leaf", rarity: "common" },
                            { id: "badge-3", name: "Social", description: "Unlocked", iconKey: "social", rarity: "common" },
                            { id: "badge-4", name: "Grower", description: "Unlocked", iconKey: "grower", rarity: "common" },
                            { id: "badge-5", name: "Connoisseur", description: "Unlocked", iconKey: "connoisseur", rarity: "common" },
                        ],
                        favorites: [
                            { id: "strain-1", name: "Wedding Cake", slug: "wedding-cake", image_url: null },
                        ],
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

    it("shows four badges first and lets the visitor expand the rest", async () => {
        render(<UserProfilePage />);

        expect(await screen.findByText("Starter")).toBeTruthy();
        expect(screen.getByText("1 Strain gesammelt")).toBeTruthy();
        expect(screen.getByText("Grower")).toBeTruthy();
        expect(screen.queryByText("Connoisseur")).toBeNull();

        fireEvent.click(screen.getByRole("button", { name: /Alle 5 anzeigen/i }));

        expect(screen.getByText("Connoisseur")).toBeTruthy();
    });

    it("renders public favorites returned by the API", async () => {
        render(<UserProfilePage />);

        fireEvent.click(await screen.findByRole("button", { name: "Favorites" }));

        expect(await screen.findByText("Wedding Cake")).toBeTruthy();
        expect(screen.queryByText("No favorites yet")).toBeNull();
    });

    it("renders strain images on public review cards", async () => {
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
                            show_badges: false,
                            show_favorites: false,
                            show_tried_strains: false,
                            show_reviews: true,
                            show_activity_feed: false,
                            show_follow_counts: true,
                            default_review_public: false,
                        },
                        blocks: [],
                        counts: {
                            followers: 0,
                            following: 0,
                            ratings: 1,
                        },
                        badges: [],
                        favorites: [],
                        triedStrains: [],
                        reviews: [
                            {
                                id: "review-1",
                                strain_id: "strain-1",
                                strain_name: "Wedding Cake",
                                strain_slug: "wedding-cake",
                                strain_image_url: "/media/strains/wedding-cake.jpg",
                                overall_rating: 5,
                                public_review_text: "Public review",
                                created_at: "2026-04-20T00:00:00.000Z",
                            },
                        ],
                        activities: [],
                    },
                },
                error: null,
            }),
        } as Response);

        render(<UserProfilePage />);

        const reviewImage = await screen.findByRole("img", { name: "Wedding Cake" });
        expect(reviewImage.getAttribute("src")).toBe("/media/strains/wedding-cake.jpg");
        expect(await screen.findByText("Public review")).toBeTruthy();
    });

    it("does not render badges or tabs when public preferences disable them", async () => {
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
                            show_badges: false,
                            show_favorites: false,
                            show_tried_strains: false,
                            show_reviews: false,
                            show_activity_feed: false,
                            show_follow_counts: false,
                            default_review_public: false,
                        },
                        blocks: [],
                        counts: {
                            followers: 0,
                            following: 0,
                            ratings: 3,
                        },
                        badges: [
                            { id: "badge-1", name: "Starter", description: "Unlocked", iconKey: "starter", rarity: "common" },
                        ],
                        favorites: [
                            { id: "strain-1", name: "Wedding Cake", slug: "wedding-cake", image_url: null },
                        ],
                        triedStrains: [],
                        reviews: [
                            {
                                id: "review-1",
                                strain_id: "strain-1",
                                strain_name: "Wedding Cake",
                                strain_slug: "wedding-cake",
                                strain_image_url: "/strains/wedding-cake.jpg",
                                overall_rating: 5,
                                public_review_text: "Public review",
                                created_at: "2026-04-20T00:00:00.000Z",
                            },
                        ],
                        activities: [
                            {
                                id: "activity-1",
                                user_id: "user-1",
                                activity_type: "rating",
                                target_id: "strain-1",
                                target_name: "Wedding Cake",
                                target_image_url: null,
                                metadata: {},
                                is_public: true,
                                created_at: "2026-04-20T00:00:00.000Z",
                            },
                        ],
                    },
                },
                error: null,
            }),
        } as Response);

        render(<UserProfilePage />);

        expect(await screen.findByText("Keine öffentlichen Inhalte freigegeben")).toBeTruthy();
        expect(screen.queryByText("Starter")).toBeNull();
        expect(screen.queryByRole("button", { name: "Activity" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Favorites" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Reviews" })).toBeNull();
        expect(screen.queryByText("Wedding Cake")).toBeNull();
        expect(screen.queryByText("Public review")).toBeNull();
    });
});
