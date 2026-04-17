import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommunityFeed } from "./feed";

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe("CommunityFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
