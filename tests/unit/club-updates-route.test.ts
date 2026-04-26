import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/communities/[id]/updates/route";
import { PATCH, DELETE } from "@/app/api/communities/[id]/updates/[updateId]/route";

const authenticateRequestMock = vi.hoisted(() => vi.fn());
const getAuthenticatedClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-response", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-response")>("@/lib/api-response");
  return { ...actual, authenticateRequest: authenticateRequestMock };
});

vi.mock("@/lib/supabase/client", () => ({
  getAuthenticatedClient: getAuthenticatedClientMock,
}));

type DbError = { code?: string; message: string };
type Resolved = { data: unknown; error: DbError | null; count?: number | null };

function chain(result: Promise<Resolved>) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  c.select = vi.fn().mockReturnValue(c);
  c.insert = vi.fn().mockReturnValue(c);
  c.update = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.gte = vi.fn().mockReturnValue(c);
  c.order = vi.fn().mockReturnValue(c);
  c.range = vi.fn(() => result);
  c.limit = vi.fn(() => result);
  c.single = vi.fn(() => result);
  return c;
}

function res(data: unknown, error: DbError | null = null, count?: number | null): Promise<Resolved> {
  return Promise.resolve({ data, error, count });
}

function supabaseForGet(membershipRows: Array<{ role: string }>, posts: Record<string, unknown>[] = [], count = 0) {
  const mc = chain(res(membershipRows));
  const fc = chain(res(posts, null, count));
  return { from: vi.fn((t: string) => t === "organization_members" ? mc : fc) };
}

function supabaseForPost(membershipRows: Array<{ role: string }>, insertResult: Record<string, unknown> | null, insertError?: DbError) {
  const mc = chain(res(membershipRows));
  const ic = chain(res(insertResult, insertError ?? null));
  return { from: vi.fn((t: string) => t === "organization_members" ? mc : ic) };
}

function supabaseForPatchDelete(membershipRows: Array<{ role: string }>, updateResult: Record<string, unknown> | null, updateError?: DbError) {
  const mc = chain(res(membershipRows));
  const uc = chain(res(updateResult, updateError ?? null));
  return { from: vi.fn((t: string) => t === "organization_members" ? mc : uc) };
}

const SAMPLE_POST = {
  id: "post-1", organization_id: "org-1", author_id: "user-1",
  post_type: "announcement", title: "Next meeting", body: "Our next meeting is on Friday.",
  metadata: {}, visibility: "club_only", moderation_status: "active",
  hidden_at: null, hidden_by: null, removed_at: null, removed_by: null,
  created_at: "2026-04-26T19:00:00Z", updated_at: "2026-04-26T19:00:00Z",
};

const rp = (id = "org-1") => ({ params: Promise.resolve({ id }) });
const urp = (id = "org-1", updateId = "post-1") => ({ params: Promise.resolve({ id, updateId }) });
const req = (url: string, method = "GET", body?: unknown) => {
  const init: RequestInit = { method };
  if (body) { init.body = JSON.stringify(body); init.headers = { "Content-Type": "application/json" }; }
  return new Request(url, init);
};

describe("GET /api/communities/[id]/updates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    authenticateRequestMock.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    expect((await GET(req("http://localhost/api/communities/org-1/updates"), rp())).status).toBe(401);
  });

  it("returns 403 for non-members", async () => {
    authenticateRequestMock.mockResolvedValue({ user: { id: "user-1" }, supabase: supabaseForGet([]) });
    const r = await GET(req("http://localhost/api/communities/org-1/updates"), rp());
    expect(r.status).toBe(403);
  });

  it("returns 403 for regular members", async () => {
    authenticateRequestMock.mockResolvedValue({ user: { id: "user-1" }, supabase: supabaseForGet([{ role: "member" }]) });
    expect((await GET(req("http://localhost/api/communities/org-1/updates"), rp())).status).toBe(403);
  });

  it("allows gründer to read updates", async () => {
    authenticateRequestMock.mockResolvedValue({ user: { id: "user-1" }, supabase: supabaseForGet([{ role: "gründer" }], [SAMPLE_POST], 1) });
    const body = await (await GET(req("http://localhost/api/communities/org-1/updates"), rp())).json();
    expect(body.data.posts).toHaveLength(1);
  });

  it("allows admin to read updates", async () => {
    authenticateRequestMock.mockResolvedValue({ user: { id: "user-1" }, supabase: supabaseForGet([{ role: "admin" }], [SAMPLE_POST], 1) });
    const body = await (await GET(req("http://localhost/api/communities/org-1/updates"), rp())).json();
    expect(body.data.posts).toHaveLength(1);
  });
});

describe("POST /api/communities/[id]/updates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    authenticateRequestMock.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    expect((await POST(req("http://localhost/api/communities/org-1/updates", "POST", { post_type: "announcement", title: "Test", body: "Hello" }), rp())).status).toBe(401);
  });

  it("returns 403 for regular members", async () => {
    authenticateRequestMock.mockResolvedValue({ user: { id: "user-1" }, supabase: supabaseForPost([{ role: "member" }], SAMPLE_POST) });
    expect((await POST(req("http://localhost/api/communities/org-1/updates", "POST", { post_type: "announcement", title: "Test", body: "Hello" }), rp())).status).toBe(403);
  });

  it("rejects invalid post_type", async () => {
    authenticateRequestMock.mockResolvedValue({ user: { id: "user-1" }, supabase: supabaseForPost([{ role: "admin" }], SAMPLE_POST) });
    const r = await POST(req("http://localhost/api/communities/org-1/updates", "POST", { post_type: "chat_message", title: "Test", body: "Hello" }), rp());
    expect(r.status).toBe(400);
    expect((await r.json()).error.message).toBe("Invalid post_type");
  });

  it("rejects price language in body", async () => {
    authenticateRequestMock.mockResolvedValue({ user: { id: "user-1" }, supabase: supabaseForPost([{ role: "admin" }], SAMPLE_POST) });
    const r = await POST(req("http://localhost/api/communities/org-1/updates", "POST", { post_type: "announcement", title: "Offer", body: "Price is 10€ per gram" }), rp());
    expect(r.status).toBe(422);
  });

  it("rejects WhatsApp contact handle", async () => {
    authenticateRequestMock.mockResolvedValue({ user: { id: "user-1" }, supabase: supabaseForPost([{ role: "admin" }], SAMPLE_POST) });
    expect((await POST(req("http://localhost/api/communities/org-1/updates", "POST", { post_type: "announcement", title: "Contact", body: "Reach us on WhatsApp" }), rp())).status).toBe(422);
  });

  it("rejects delivery language", async () => {
    authenticateRequestMock.mockResolvedValue({ user: { id: "user-1" }, supabase: supabaseForPost([{ role: "admin" }], SAMPLE_POST) });
    expect((await POST(req("http://localhost/api/communities/org-1/updates", "POST", { post_type: "announcement", title: "Info", body: "Lieferung available" }), rp())).status).toBe(422);
  });

  it("rejects medical cure claims", async () => {
    authenticateRequestMock.mockResolvedValue({ user: { id: "user-1" }, supabase: supabaseForPost([{ role: "admin" }], SAMPLE_POST) });
    expect((await POST(req("http://localhost/api/communities/org-1/updates", "POST", { post_type: "announcement", title: "Heilt alles", body: "This strain heilt everything" }), rp())).status).toBe(422);
  });

  it("rejects title too short", async () => {
    authenticateRequestMock.mockResolvedValue({ user: { id: "user-1" }, supabase: supabaseForPost([{ role: "admin" }], SAMPLE_POST) });
    expect((await POST(req("http://localhost/api/communities/org-1/updates", "POST", { post_type: "announcement", title: "AB", body: "Valid body" }), rp())).status).toBe(400);
  });

  it("allows admin to create valid post", async () => {
    authenticateRequestMock.mockResolvedValue({ user: { id: "user-1" }, supabase: supabaseForPost([{ role: "admin" }], SAMPLE_POST) });
    const r = await POST(req("http://localhost/api/communities/org-1/updates", "POST", { post_type: "announcement", title: "Next meeting", body: "Our next meeting is on Friday." }), rp());
    const body = await r.json();
    expect(r.status).toBe(201);
    expect(body.data.post_type).toBe("announcement");
    expect(body.data.title).toBe("Next meeting");
    expect(body.data.visibility).toBe("club_only");
    expect(body.data.moderation_status).toBe("active");
  });
});

describe("DELETE /api/communities/[id]/updates/[updateId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    authenticateRequestMock.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    expect((await DELETE(req("http://localhost/api/communities/org-1/updates/post-1", "DELETE"), urp())).status).toBe(401);
  });

  it("returns 403 for regular members", async () => {
    authenticateRequestMock.mockResolvedValue({ user: { id: "user-1" }, supabase: supabaseForPatchDelete([{ role: "member" }], null) });
    expect((await DELETE(req("http://localhost/api/communities/org-1/updates/post-1", "DELETE"), urp())).status).toBe(403);
  });

  it("soft-removes post as admin", async () => {
    const removed = { ...SAMPLE_POST, moderation_status: "removed", removed_at: "2026-04-26T19:00:00Z", removed_by: "user-1" };
    authenticateRequestMock.mockResolvedValue({ user: { id: "user-1" }, supabase: supabaseForPatchDelete([{ role: "admin" }], removed) });
    const body = await (await DELETE(req("http://localhost/api/communities/org-1/updates/post-1", "DELETE"), urp())).json();
    expect(body.data.moderation_status).toBe("removed");
    expect(body.data.removed_by).toBe("user-1");
  });
});

describe("PATCH /api/communities/[id]/updates/[updateId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    authenticateRequestMock.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    expect((await PATCH(req("http://localhost/api/communities/org-1/updates/post-1", "PATCH", { title: "Updated" }), urp())).status).toBe(401);
  });

  it("returns 403 for regular members", async () => {
    authenticateRequestMock.mockResolvedValue({ user: { id: "user-1" }, supabase: supabaseForPatchDelete([{ role: "member" }], null) });
    expect((await PATCH(req("http://localhost/api/communities/org-1/updates/post-1", "PATCH", { title: "Updated" }), urp())).status).toBe(403);
  });

  it("rejects prohibited language in updated content", async () => {
    authenticateRequestMock.mockResolvedValue({ user: { id: "user-1" }, supabase: supabaseForPatchDelete([{ role: "admin" }], SAMPLE_POST) });
    expect((await PATCH(req("http://localhost/api/communities/org-1/updates/post-1", "PATCH", { body: "Abholung available now" }), urp())).status).toBe(422);
  });

  it("allows admin to hide post", async () => {
    const hidden = { ...SAMPLE_POST, moderation_status: "hidden", hidden_at: "2026-04-26T19:00:00Z", hidden_by: "user-1" };
    authenticateRequestMock.mockResolvedValue({ user: { id: "user-1" }, supabase: supabaseForPatchDelete([{ role: "admin" }], hidden) });
    const body = await (await PATCH(req("http://localhost/api/communities/org-1/updates/post-1", "PATCH", { moderation_status: "hidden" }), urp())).json();
    expect(body.data.moderation_status).toBe("hidden");
    expect(body.data.hidden_by).toBe("user-1");
  });
});
