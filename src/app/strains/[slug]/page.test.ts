import { describe, expect, it, vi } from "vitest";
import { generateMetadata } from "./page";

const createServerSupabaseClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

vi.mock("./StrainDetailPageClient", () => ({
  default: function StrainDetailPageClient() {
    return null;
  },
}));

describe("strain detail metadata", () => {
  it("uses schema-safe strain fields so existing strains do not get a not-found title", async () => {
    createServerSupabaseClientMock.mockResolvedValue({
      from: () => ({
        select: (columns: string) => ({
          eq: () => ({
            single: async () => {
              if (columns.includes("breeder") || columns.includes("thc_level")) {
                return { data: null, error: { message: "column does not exist" } };
              }

              return {
                data: {
                  name: "Apple Fritter",
                  description: "Sweet hybrid strain",
                  thc_max: 24,
                  farmer: "LUMPY",
                },
                error: null,
              };
            },
          }),
        }),
      }),
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "apple-fritter" }),
    });

    expect(metadata.title).toBe("Apple Fritter");
  });
});
