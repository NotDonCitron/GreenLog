import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "@/app/api/grows/[id]/comments/route";

const authenticateRequestMock = vi.hoisted(() => vi.fn());
const getAuthenticatedClientMock = vi.hoisted(() => vi.fn());

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

function routeParams(id = "grow-1") {
  return { params: Promise.resolve({ id }) };
}

describe("/api/grows/[id]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("still requires authentication", async () => {
    authenticateRequestMock.mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    const response = await GET(
      new Request("http://localhost/api/grows/grow-1/comments?entry_id=entry-1"),
      routeParams()
    );

    expect(response.status).toBe(401);
    expect(authenticateRequestMock).toHaveBeenCalled();
  });

  it.each([
    ["GET", () => GET(new Request("http://localhost/api/grows/grow-1/comments?entry_id=entry-1"), routeParams())],
    ["POST", () => POST(new Request("http://localhost/api/grows/grow-1/comments", { method: "POST" }), routeParams())],
    ["DELETE", () => DELETE(new Request("http://localhost/api/grows/grow-1/comments?comment_id=comment-1", { method: "DELETE" }), routeParams())],
  ])("%s returns gone before touching grow_comments", async (_method, callRoute) => {
    const supabase = { from: vi.fn() };
    authenticateRequestMock.mockResolvedValue({
      user: { id: "user-1" },
      supabase,
    });

    const response = await callRoute();
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body.error).toMatchObject({
      message: "Grow comments are disabled for closed beta",
      code: "COMMENTS_DISABLED",
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
