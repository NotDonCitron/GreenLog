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
});
