import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/communities/[id]/feed/route";

const authenticateRequestMock = vi.hoisted(() => vi.fn());
const getAuthenticatedClientMock = vi.hoisted(() => vi.fn());
const getSupabaseAdminMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-response", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-response")>("@/lib/api-response");
  return {
    ...actual,
    authenticateRequest: authenticateRequestMock,
  };
});

vi.mock("@/lib/supabase/client", () => ({
  getAuthenticatedClient: getAuthenticatedClientMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
}));

type DbError = { code?: string; message: string };
type QueryResult<T> = Promise<{ data: T; error: DbError | null }>;

function createQuery<T>(result: QueryResult<T>) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn(() => result),
    limit: vi.fn(() => result),
    in: vi.fn(() => result),
  };
}

function createFeedSupabase(options: {
  membershipRows: Array<{ role: string }>;
  feedEntries?: Array<{
    id: string;
    organization_id: string;
    event_type: string;
    reference_id: string | null;
    user_id: string | null;
    created_at: string;
  }>;
  membershipError?: DbError | null;
}) {
  const queries = {
    membership: createQuery(Promise.resolve({
      data: options.membershipRows,
      error: options.membershipError ?? null,
    })),
    feed: createQuery(Promise.resolve({
      data: options.feedEntries ?? [],
      error: null,
    })),
    profiles: createQuery(Promise.resolve({
      data: [],
      error: null,
    })),
  };
  const from = vi.fn((table: string) => {
    if (table === "organization_members") return queries.membership;
    if (table === "community_feed") return queries.feed;
    if (table === "profiles") return queries.profiles;
    throw new Error(`Unexpected table: ${table}`);
  });

  return { from, queries };
}

function routeParams(id = "org-1") {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/communities/[id]/feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseAdminMock.mockImplementation(() => {
      throw new Error("service role unavailable in test");
    });
  });

  it("requires authentication before reading community feed rows", async () => {
    authenticateRequestMock.mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    const response = await GET(
      new Request("http://localhost/api/communities/org-1/feed"),
      routeParams()
    );

    expect(response.status).toBe(401);
    expect(authenticateRequestMock).toHaveBeenCalled();
  });

  it("rejects authenticated non-members before reading community feed rows", async () => {
    const supabase = createFeedSupabase({ membershipRows: [] });
    authenticateRequestMock.mockResolvedValue({
      user: { id: "user-1" },
      supabase,
    });

    const response = await GET(
      new Request("http://localhost/api/communities/org-1/feed"),
      routeParams()
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.message).toBe("Forbidden");
    expect(supabase.from).not.toHaveBeenCalledWith("community_feed");
  });

  it("allows active members to read their own community feed", async () => {
    const supabase = createFeedSupabase({
      membershipRows: [{ role: "member" }],
      feedEntries: [
        {
          id: "feed-1",
          organization_id: "org-1",
          event_type: "member_joined",
          reference_id: null,
          user_id: null,
          created_at: "2026-04-26T00:00:00.000Z",
        },
      ],
    });
    authenticateRequestMock.mockResolvedValue({
      user: { id: "user-1" },
      supabase,
    });

    const response = await GET(
      new Request("http://localhost/api/communities/org-1/feed"),
      routeParams()
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.feed).toHaveLength(1);
    expect(supabase.from).toHaveBeenCalledWith("community_feed");
    expect(supabase.queries.membership.eq).toHaveBeenCalledWith("organization_id", "org-1");
    expect(supabase.queries.membership.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(supabase.queries.membership.eq).toHaveBeenCalledWith("membership_status", "active");
  });
});
