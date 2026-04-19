import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("global 18+ middleware", () => {
  it("redirects protected pages to age gate when the age cookie is missing", () => {
    const request = new NextRequest("https://greenlog.app/strains");

    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://greenlog.app/age-gate?next=%2Fstrains");
  });

  it("allows protected pages when the age cookie is present", () => {
    const request = new NextRequest("https://greenlog.app/strains", {
      headers: { cookie: "greenlog_age_verified=true" },
    });

    const response = middleware(request);

    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps legal pages public without age verification", () => {
    const request = new NextRequest("https://greenlog.app/impressum");

    const response = middleware(request);

    expect(response.headers.get("location")).toBeNull();
  });
});

describe("age gate cookie helpers", () => {
  it("builds a production-safe 18+ verification cookie", async () => {
    const { buildAgeCookie } = await import("@/components/age-gate");

    expect(buildAgeCookie("greenlog_age_verified", "true", true)).toBe(
      "greenlog_age_verified=true; Max-Age=15552000; Path=/; SameSite=Lax; Secure",
    );
  });
});

describe("GDPR export coverage", () => {
  it("exports active grow-related datasets", async () => {
    vi.resetModules();

    const queries: string[] = [];
    const user = { id: "user-1", email: "user@example.test" };

    vi.doMock("@/lib/api-response", async () => {
      const actual = await vi.importActual<typeof import("@/lib/api-response")>("@/lib/api-response");
      return {
        ...actual,
        authenticateRequest: vi.fn(async () => ({
          user,
          supabase: {
            from(table: string) {
              queries.push(table);
              const chain = {
                select: vi.fn(() => chain),
                eq: vi.fn(() => chain),
                order: vi.fn(() => chain),
                single: vi.fn(async () => ({ data: { id: user.id }, error: null })),
                then(resolve: (value: { data: unknown[]; error: null }) => void) {
                  return Promise.resolve({ data: [], error: null }).then(resolve);
                },
              };
              return chain;
            },
          },
        })),
      };
    });

    const { GET } = await import("@/app/api/gdpr/export/route");
    const response = await GET(new Request("https://greenlog.app/api/gdpr/export"));
    const body = await response.json();

    expect(body.data.grows).toEqual({
      grows: [],
      plants: [],
      grow_entries: [],
      grow_reminders: [],
    });
    expect(queries).toEqual(expect.arrayContaining(["grows", "plants", "grow_entries"]));
  });
});
