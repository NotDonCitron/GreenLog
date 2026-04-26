import { authenticateRequest, jsonError, jsonSuccess } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import {
  checkReportRateLimit,
  getUserModerationRestriction,
  isAdminRole,
  logModerationAction,
  requireOrgMembership,
} from "@/lib/moderation";

type RouteParams = { params: Promise<{ id: string }> };
type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
const VALID_REPORT_STATUSES: Set<string> = new Set(["open", "reviewing", "resolved", "dismissed"]);

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;
    const { id: organizationId } = await params;
    const { searchParams } = new URL(request.url);

    const membership = await requireOrgMembership(supabase, organizationId, user.id);
    if (!membership.ok) {
      return jsonError(membership.message, membership.status, membership.code, membership.detail);
    }
    if (!isAdminRole(membership.role)) {
      return jsonError("Forbidden", 403);
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    let query = supabase
      .from("user_reports")
      .select("id, organization_id, reporter_id, reported_user_id, reason, details, status, assigned_to, resolved_by, resolved_at, created_at, updated_at", { count: "exact" })
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const status = searchParams.get("status");
    if (status) query = query.eq("status", status);

    const { data, error, count } = await query;
    if (error) {
      return jsonError("Failed to fetch user reports", 500, error.code, error.message);
    }

    return jsonSuccess({
      reports: data ?? [],
      pagination: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;
    const { id: organizationId } = await params;

    const membership = await requireOrgMembership(supabase, organizationId, user.id);
    if (!membership.ok) {
      return jsonError(membership.message, membership.status, membership.code, membership.detail);
    }

    const restriction = await getUserModerationRestriction(supabase, organizationId, user.id);
    if (restriction.blocked) {
      return jsonError(restriction.message, restriction.status);
    }

    const rate = await checkReportRateLimit(supabase, organizationId, user.id);
    if (rate.limited) {
      return jsonError(rate.message, rate.status);
    }

    const body = await request.json();
    const reportedUserId = typeof body.reported_user_id === "string" ? body.reported_user_id.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const details = typeof body.details === "string" ? body.details.trim() : null;

    if (!reportedUserId) {
      return jsonError("reported_user_id is required", 400);
    }
    if (reportedUserId === user.id) {
      return jsonError("You cannot report yourself", 400);
    }
    if (reason.length < 3 || reason.length > 200) {
      return jsonError("Reason must be between 3 and 200 characters", 400);
    }
    if (details && details.length > 2000) {
      return jsonError("Details cannot exceed 2000 characters", 400);
    }

    const { data: targetMembership, error: targetMembershipError } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("user_id", reportedUserId)
      .eq("membership_status", "active")
      .limit(1);

    if (targetMembershipError) {
      return jsonError("Failed to verify reported user", 500, targetMembershipError.code, targetMembershipError.message);
    }
    if ((targetMembership ?? []).length === 0) {
      return jsonError("Reported user is not an active member of this club", 404);
    }

    const { data: report, error: insertError } = await supabase
      .from("user_reports")
      .insert({
        organization_id: organizationId,
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        reason,
        details,
        status: "open",
      })
      .select("id, organization_id, reporter_id, reported_user_id, reason, details, status, assigned_to, resolved_by, resolved_at, created_at, updated_at")
      .single();

    if (insertError) {
      return jsonError("Failed to create user report", 500, insertError.code, insertError.message);
    }

    await logModerationAction(supabase, {
      organizationId,
      actorId: user.id,
      actionType: "user_report_created",
      targetType: "user_report",
      targetId: report.id,
      details: { reported_user_id: reportedUserId },
    });

    return jsonSuccess(report, 201);
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;
    const { id: organizationId } = await params;

    const membership = await requireOrgMembership(supabase, organizationId, user.id);
    if (!membership.ok) {
      return jsonError(membership.message, membership.status, membership.code, membership.detail);
    }
    if (!isAdminRole(membership.role)) {
      return jsonError("Forbidden", 403);
    }

    const body = await request.json();
    const reportId = typeof body.report_id === "string" ? body.report_id.trim() : "";
    const status = body.status as ReportStatus;
    const assignedTo = typeof body.assigned_to === "string" ? body.assigned_to.trim() : null;
    const resolutionNote = typeof body.resolution_note === "string" ? body.resolution_note.trim() : null;

    if (!reportId) {
      return jsonError("report_id is required", 400);
    }
    if (!status || !VALID_REPORT_STATUSES.has(status)) {
      return jsonError("Invalid status", 400);
    }
    if (resolutionNote && resolutionNote.length > 2000) {
      return jsonError("resolution_note cannot exceed 2000 characters", 400);
    }

    const updatePayload: Record<string, unknown> = {
      status,
      assigned_to: assignedTo,
      updated_at: new Date().toISOString(),
    };

    if (status === "resolved" || status === "dismissed") {
      updatePayload.resolved_by = user.id;
      updatePayload.resolved_at = new Date().toISOString();
    } else {
      updatePayload.resolved_by = null;
      updatePayload.resolved_at = null;
    }

    const { data, error } = await supabase
      .from("user_reports")
      .update(updatePayload)
      .eq("id", reportId)
      .eq("organization_id", organizationId)
      .select("id, organization_id, reporter_id, reported_user_id, reason, details, status, assigned_to, resolved_by, resolved_at, created_at, updated_at")
      .single();

    if (error) {
      return jsonError("Failed to update user report", 500, error.code, error.message);
    }

    if (status === "resolved" || status === "dismissed") {
      await logModerationAction(supabase, {
        organizationId,
        actorId: user.id,
        actionType: "report_resolved",
        targetType: "user_report",
        targetId: reportId,
        details: { status, resolution_note: resolutionNote },
      });
    }

    return jsonSuccess(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonError("Internal server error", 500);
  }
}
