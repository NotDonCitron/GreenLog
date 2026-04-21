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
      }),
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "apple-fritter" }),
    });

    expect(metadata.title).toBe("Apple Fritter");
  });

  it("does not generate public metadata for unpublished strains", async () => {
    const eqCalls: Array<[string, string]> = [];

    createServerSupabaseClientMock.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: (column: string, value: string) => {
            eqCalls.push([column, value]);
            if (column === "slug" && value === "hidden-dream") {
              return {
                eq: (publicationColumn: string, publicationValue: string) => {
                  eqCalls.push([publicationColumn, publicationValue]);
                  if (publicationColumn === "publication_status" && publicationValue === "published") {
                    return {
                      single: async () => ({
                        data: null,
                        error: { message: "No rows" },
                      }),
                    };
                  }
                  return {
                    single: async () => ({
                      data: {
                        name: "Should Not Resolve",
                        description: "Unpublished",
                        thc_max: 20,
                        farmer: "Private",
                      },
                      error: null,
                    }),
                  };
                },
              };
            }

            return {
              eq: () => ({
                single: async () => ({
                  data: null,
                  error: { message: "Unexpected query path" },
                }),
              }),
            };
          },
        }),
      }),
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "hidden-dream" }),
    });

    expect(metadata.title).toBe("Strain nicht gefunden | CannaLog");
    expect(eqCalls).toContainEqual(["publication_status", "published"]);
  });
});
