import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../../src/app/api/public-profiles/[username]/route";

vi.mock("../../src/lib/public-profile", () => ({
  getPublicProfileByUsername: vi.fn(),
}));

vi.mock("../../src/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({ from: vi.fn() })),
}));

describe("GET /api/public-profiles/[username]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when the profile is missing or private", async () => {
    const { getPublicProfileByUsername } = await import("../../src/lib/public-profile");
    (getPublicProfileByUsername as any).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/public-profiles/private-user"), {
      params: Promise.resolve({ username: "private-user" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns a sanitized public profile payload", async () => {
    const { getPublicProfileByUsername } = await import("../../src/lib/public-profile");
    (getPublicProfileByUsername as any).mockResolvedValue({
      profile: {
        id: "user-1",
        username: "green",
        display_name: "Green User",
        avatar_url: null,
        bio: "Taste profile",
        created_at: "2026-04-20T08:00:00.000Z",
      },
      preferences: {
        user_id: "user-1",
        show_badges: true,
        show_favorites: false,
        show_tried_strains: false,
        show_reviews: false,
        show_activity_feed: false,
        show_follow_counts: true,
        default_review_public: false,
      },
      blocks: [],
      counts: { followers: 1, following: 2, ratings: 3 },
      badges: [],
      favorites: [],
      triedStrains: [],
      reviews: [],
      activities: [],
    });

    const response = await GET(new Request("http://localhost/api/public-profiles/green"), {
      params: Promise.resolve({ username: "green" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.profile.profile.username).toBe("green");
    expect(JSON.stringify(json)).not.toContain("dose");
    expect(JSON.stringify(json)).not.toContain("batch");
    expect(JSON.stringify(json)).not.toContain("pharmacy");
  });
});
