import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DELETE as deleteBlock,
  GET as getBlocks,
  POST as postBlock,
} from "@/app/api/communities/[id]/moderation/blocks/route";
import {
  PATCH as patchContentReport,
} from "@/app/api/communities/[id]/reports/content/route";
import {
  PATCH as patchUserReport,
} from "@/app/api/communities/[id]/reports/user/route";

const authenticateRequestMock = vi.hoisted(() => vi.fn());
const getAuthenticatedClientMock = vi.hoisted(() => vi.fn());
const requireOrgMembershipMock = vi.hoisted(() => vi.fn());
const logModerationActionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-response", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-response")>("@/lib/api-response");
  return { ...actual, authenticateRequest: authenticateRequestMock };
});

vi.mock("@/lib/supabase/client", () => ({
  getAuthenticatedClient: getAuthenticatedClientMock,
}));

vi.mock("@/lib/moderation", async () => {
  const actual = await vi.importActual<typeof import("@/lib/moderation")>("@/lib/moderation");
  return {
    ...actual,
    requireOrgMembership: requireOrgMembershipMock,
    isAdminRole: (role: string) => role === "admin" || role === "gründer",
    logModerationAction: logModerationActionMock,
  };
});

type DbError = { code?: string; message: string };
type Resolved = { data: unknown; error: DbError | null; count?: number | null };

function res(data: unknown, error: DbError | null = null, count?: number | null): Promise<Resolved> {
  return Promise.resolve({ data, error, count });
}

function chain(result: Promise<Resolved>) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  c.select = vi.fn().mockReturnValue(c);
  c.insert = vi.fn().mockReturnValue(c);
  c.update = vi.fn().mockReturnValue(c);
  c.delete = vi.fn().mockReturnValue(c);
  c.upsert = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.order = vi.fn().mockReturnValue(c);
  c.range = vi.fn(() => result);
  c.limit = vi.fn(() => result);
  c.single = vi.fn(() => result);
  return c;
}

const routeParams = (id = "org-1") => ({ params: Promise.resolve({ id }) });

describe("community moderation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOrgMembershipMock.mockResolvedValue({ ok: true, role: "admin" });
    logModerationActionMock.mockResolvedValue(undefined);
  });

  it("POST /moderation/blocks validates user_id", async () => {
    authenticateRequestMock.mockResolvedValue({ user: { id: "admin-1" }, supabase: { from: vi.fn() } });

    const response = await postBlock(
      new Request("http://localhost/api/communities/org-1/moderation/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "spam" }),
      }),
      routeParams()
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe("user_id is required");
  });

  it("POST /moderation/blocks creates block and logs action", async () => {
    const membershipChain = chain(res([{ user_id: "user-2" }]));
    const insertChain = chain(res({
      id: "block-1",
      organization_id: "org-1",
      blocker_user_id: "admin-1",
      blocked_user_id: "user-2",
      reason: "spam",
      created_at: "2026-04-26T22:00:00Z",
    }));
    const supabase = {
      from: vi.fn((table: string) => (table === "organization_members" ? membershipChain : insertChain)),
    };
    authenticateRequestMock.mockResolvedValue({ user: { id: "admin-1" }, supabase });

    const response = await postBlock(
      new Request("http://localhost/api/communities/org-1/moderation/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "user-2", reason: "spam" }),
      }),
      routeParams()
    );

    expect(response.status).toBe(201);
    expect(logModerationActionMock).toHaveBeenCalledOnce();
  });

  it("DELETE /moderation/blocks rejects non-admin role", async () => {
    requireOrgMembershipMock.mockResolvedValueOnce({ ok: true, role: "member" });
    authenticateRequestMock.mockResolvedValue({ user: { id: "member-1" }, supabase: { from: vi.fn() } });

    const response = await deleteBlock(
      new Request("http://localhost/api/communities/org-1/moderation/blocks?user_id=user-2", { method: "DELETE" }),
      routeParams()
    );

    expect(response.status).toBe(403);
  });

  it("GET /moderation/blocks returns block list for admins", async () => {
    const rows = [
      {
        id: "block-1",
        organization_id: "org-1",
        blocker_user_id: "admin-1",
        blocked_user_id: "user-2",
        reason: "spam",
        created_at: "2026-04-26T22:00:00Z",
      },
    ];
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(() => res(rows)),
    };
    const supabase = { from: vi.fn(() => selectChain) };
    authenticateRequestMock.mockResolvedValue({ user: { id: "admin-1" }, supabase });

    const response = await getBlocks(
      new Request("http://localhost/api/communities/org-1/moderation/blocks"),
      routeParams()
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.blocks).toHaveLength(1);
  });

  it("PATCH /reports/content validates status", async () => {
    authenticateRequestMock.mockResolvedValue({ user: { id: "admin-1" }, supabase: { from: vi.fn() } });
    const response = await patchContentReport(
      new Request("http://localhost/api/communities/org-1/reports/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: "ec7f2a11-a8e7-4fb0-a958-17ca93dd1030", status: "closed" }),
      }),
      routeParams()
    );
    expect(response.status).toBe(400);
  });

  it("PATCH /reports/content resolves report and logs action", async () => {
    const updateChain = chain(res({
      id: "ec7f2a11-a8e7-4fb0-a958-17ca93dd1030",
      organization_id: "org-1",
      reporter_id: "user-1",
      content_type: "community_feed",
      content_id: "8e65fcb5-57ee-4d31-ae2d-a9fe5e77ee9f",
      reason: "spam",
      details: null,
      status: "resolved",
      assigned_to: "admin-1",
      resolved_by: "admin-1",
      resolved_at: "2026-04-26T22:00:00Z",
      created_at: "2026-04-26T21:00:00Z",
      updated_at: "2026-04-26T22:00:00Z",
    }));
    const supabase = { from: vi.fn(() => updateChain) };
    authenticateRequestMock.mockResolvedValue({ user: { id: "admin-1" }, supabase });

    const response = await patchContentReport(
      new Request("http://localhost/api/communities/org-1/reports/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: "ec7f2a11-a8e7-4fb0-a958-17ca93dd1030",
          status: "resolved",
          assigned_to: "admin-1",
        }),
      }),
      routeParams()
    );

    expect(response.status).toBe(200);
    expect(logModerationActionMock).toHaveBeenCalled();
  });

  it("PATCH /reports/user resolves report and logs action", async () => {
    const updateChain = chain(res({
      id: "user-report-1",
      organization_id: "org-1",
      reporter_id: "user-1",
      reported_user_id: "user-2",
      reason: "abuse",
      details: null,
      status: "dismissed",
      assigned_to: "admin-1",
      resolved_by: "admin-1",
      resolved_at: "2026-04-26T22:10:00Z",
      created_at: "2026-04-26T21:00:00Z",
      updated_at: "2026-04-26T22:10:00Z",
    }));
    const supabase = { from: vi.fn(() => updateChain) };
    authenticateRequestMock.mockResolvedValue({ user: { id: "admin-1" }, supabase });

    const response = await patchUserReport(
      new Request("http://localhost/api/communities/org-1/reports/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: "user-report-1",
          status: "dismissed",
          assigned_to: "admin-1",
        }),
      }),
      routeParams()
    );

    expect(response.status).toBe(200);
    expect(logModerationActionMock).toHaveBeenCalled();
  });
});
