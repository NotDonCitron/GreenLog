import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommunityFeed } from "./feed";

const { supabaseFromMock } = vi.hoisted(() => ({
  supabaseFromMock: vi.fn((_table?: string) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: supabaseFromMock,
  },
}));

describe("CommunityFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseFromMock.mockImplementation((_table?: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          feed: [
            {
              id: "feed-1",
              organization_id: "org-1",
              event_type: "strain_created",
              reference_id: "missing-strain",
              user_id: "user-1",
              created_at: new Date().toISOString(),
              user: null,
            },
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
        error: null,
      }),
    }) as typeof fetch;
  });

  it("renders a strain-created feed item while the strain data is still missing", async () => {
    render(<CommunityFeed organizationId="org-1" />);

    await waitFor(() => {
      expect(screen.getByText("Unbekannter Farmer")).toBeDefined();
    });
  });

  it("renders strain data included in the feed response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          feed: [
            {
              id: "feed-2",
              organization_id: "org-1",
              event_type: "strain_created",
              reference_id: "strain-1",
              user_id: "user-1",
              created_at: new Date().toISOString(),
              user: null,
              strain: {
                id: "strain-1",
                name: "Blaubarschbube",
                slug: "blaubarschbube",
                type: "hybrid",
                image_url: null,
                avg_thc: null,
                thc_max: null,
                avg_cbd: null,
                cbd_max: null,
                farmer: "Bikini Bottom",
                manufacturer: null,
                brand: null,
                flavors: null,
                terpenes: null,
                effects: null,
                is_medical: false,
              },
            },
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
        error: null,
      }),
    }) as typeof fetch;

    render(<CommunityFeed organizationId="org-1" />);

    await waitFor(() => {
      expect(screen.getByText("Bikini Bottom")).toBeDefined();
      expect(screen.getByText("Blaubarschbube")).toBeDefined();
    });
  });

  it("uses the collection image when feed strain data has no image", async () => {
    supabaseFromMock.mockImplementation((table?: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({
        data: table === "user_collection" ? { user_image_url: "https://example.com/collection.png" } : null,
        error: null,
      }),
    }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          feed: [
            {
              id: "feed-3",
              organization_id: "org-1",
              event_type: "strain_created",
              reference_id: "strain-1",
              user_id: "user-1",
              created_at: new Date().toISOString(),
              user: null,
              strain: {
                id: "strain-1",
                name: "Gothgirl mega Kush v2",
                slug: "gothgirl-mega-kush-v2",
                type: "hybrid",
                image_url: null,
                avg_thc: null,
                thc_max: null,
                avg_cbd: null,
                cbd_max: null,
                farmer: "Test Farmer",
                manufacturer: null,
                brand: null,
                flavors: null,
                terpenes: null,
                effects: null,
                is_medical: false,
              },
            },
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
        error: null,
      }),
    }) as typeof fetch;

    render(<CommunityFeed organizationId="org-1" />);

    await waitFor(() => {
      expect(screen.getByAltText("Gothgirl mega Kush v2")).toHaveProperty("src", "https://example.com/collection.png");
    });
  });
});
