import { describe, expect, it, vi } from "vitest";
import sitemap from "@/app/sitemap";

const createServerSupabaseClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

describe("sitemap", () => {
  it("keeps internal community and feed routes out of the public sitemap", async () => {
    createServerSupabaseClientMock.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: async () => ({
              data: [
                {
                  slug: "published-strain",
                  created_at: "2026-04-26T00:00:00.000Z",
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).not.toContain("https://greenlog.app/community");
    expect(urls).not.toContain("https://greenlog.app/feed");
    expect(urls).toContain("https://greenlog.app/strains/published-strain");
  });
});
