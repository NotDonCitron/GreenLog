import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PUBLIC_PROFILE_PREFERENCES,
  buildPublicProfileBlocks,
  getPublicProfileByUsername,
  sanitizePublicActivity,
  sanitizePublicRating,
} from "./public-profile";

describe("public profile sanitizer", () => {
  it("defaults optional public blocks to private", () => {
    const blocks = buildPublicProfileBlocks(DEFAULT_PUBLIC_PROFILE_PREFERENCES);

    expect(blocks.find((block) => block.key === "badges")?.state).toBe("public");
    expect(blocks.find((block) => block.key === "favorites")?.state).toBe("private");
    expect(blocks.find((block) => block.key === "reviews")?.state).toBe("private");
    expect(blocks.find((block) => block.key === "activity")?.state).toBe("private");
  });

  it("removes private fields from public ratings", () => {
    const sanitized = sanitizePublicRating({
      id: "rating-1",
      strain_id: "strain-1",
      overall_rating: 4,
      public_review_text: "Clear taste and calm effect",
      review: "Private note with pharmacy details",
      dose: "0.2g",
      batch: "ABC-123",
      pharmacy: "Private Apotheke",
      created_at: "2026-04-20T08:00:00.000Z",
      strains: {
        name: "Wedding Cake",
        slug: "wedding-cake",
      },
    });

    expect(sanitized).toEqual({
      id: "rating-1",
      strain_id: "strain-1",
      strain_name: "Wedding Cake",
      strain_slug: "wedding-cake",
      overall_rating: 4,
      public_review_text: "Clear taste and calm effect",
      created_at: "2026-04-20T08:00:00.000Z",
    });
    expect(JSON.stringify(sanitized)).not.toContain("Private Apotheke");
    expect(JSON.stringify(sanitized)).not.toContain("ABC-123");
    expect(JSON.stringify(sanitized)).not.toContain("0.2g");
  });

  it("uses public_payload and ignores raw private metadata for activities", () => {
    const sanitized = sanitizePublicActivity({
      id: "activity-1",
      user_id: "user-1",
      activity_type: "rating",
      target_id: "strain-1",
      target_name: "Wedding Cake",
      target_image_url: null,
      metadata: { pharmacy: "Private Apotheke", dose: "0.2g" },
      public_payload: { rating: 4, strain_slug: "wedding-cake" },
      private_payload: { batch: "ABC-123" },
      is_public: true,
      created_at: "2026-04-20T08:00:00.000Z",
    });

    expect(sanitized.metadata).toEqual({ rating: 4, strain_slug: "wedding-cake" });
    expect(JSON.stringify(sanitized)).not.toContain("Private Apotheke");
    expect(JSON.stringify(sanitized)).not.toContain("ABC-123");
    expect(JSON.stringify(sanitized)).not.toContain("0.2g");
  });

  it("loads favorites from is_favorite when the public favorites block is enabled", async () => {
    const favoriteEq = vi.fn().mockReturnThis();
    const favoriteLimit = vi.fn().mockResolvedValue({ data: [] });
    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: "user-1",
              username: "greenleaf",
              display_name: "Green Leaf",
              avatar_url: null,
              bio: null,
              profile_visibility: "public",
              created_at: "2026-04-20T08:00:00.000Z",
            },
          }),
        };
      }

      if (table === "user_public_preferences") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              user_id: "user-1",
              show_badges: false,
              show_favorites: true,
              show_tried_strains: false,
              show_reviews: false,
              show_activity_feed: false,
              show_follow_counts: false,
              default_review_public: false,
            },
          }),
        };
      }

      if (table === "user_strain_relations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: favoriteEq,
          limit: favoriteLimit,
        };
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      };
    });

    await getPublicProfileByUsername({ from } as never, "greenleaf");

    expect(favoriteEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(favoriteEq).toHaveBeenCalledWith("is_favorite", true);
    expect(favoriteEq).not.toHaveBeenCalledWith("public_status", "favorite");
  });
});
