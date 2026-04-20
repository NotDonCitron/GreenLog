import { describe, expect, it } from "vitest";
import {
  DEFAULT_PUBLIC_PROFILE_PREFERENCES,
  buildPublicProfileBlocks,
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
});
