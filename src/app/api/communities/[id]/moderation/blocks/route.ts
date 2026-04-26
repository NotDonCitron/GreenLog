import { authenticateRequest, jsonError, jsonSuccess } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { isAdminRole, logModerationAction, requireOrgMembership } from "@/lib/moderation";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
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

    const { data, error } = await supabase
      .from("user_blocks")
      .select("id, organization_id, blocker_user_id, blocked_user_id, reason, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      return jsonError("Failed to fetch blocks", 500, error.code, error.message);
    }

    return jsonSuccess({ blocks: data ?? [] });
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
    if (!isAdminRole(membership.role)) {
      return jsonError("Forbidden", 403);
    }

    const body = await request.json();
    const targetUserId = typeof body.user_id === "string" ? body.user_id.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : null;

    if (!targetUserId) {
      return jsonError("user_id is required", 400);
    }
    if (targetUserId === user.id) {
      return jsonError("You cannot block yourself", 400);
    }
    if (reason && reason.length > 500) {
      return jsonError("Reason cannot exceed 500 characters", 400);
    }

    const { data: targetMembership, error: targetMembershipError } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("user_id", targetUserId)
      .eq("membership_status", "active")
      .limit(1);

    if (targetMembershipError) {
      return jsonError("Failed to verify target member", 500, targetMembershipError.code, targetMembershipError.message);
    }
    if ((targetMembership ?? []).length === 0) {
      return jsonError("Target user is not an active member", 404);
    }

    const { data, error } = await supabase
      .from("user_blocks")
      .insert({
        organization_id: organizationId,
        blocker_user_id: user.id,
        blocked_user_id: targetUserId,
        reason,
      })
      .select("id, organization_id, blocker_user_id, blocked_user_id, reason, created_at")
      .single();

    if (error) {
      return jsonError("Failed to block user", 500, error.code, error.message);
    }

    await logModerationAction(supabase, {
      organizationId,
      actorId: user.id,
      actionType: "user_blocked",
      targetType: "user_block",
      targetId: data.id,
      details: { user_id: targetUserId },
    });

    return jsonSuccess(data, 201);
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
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

    const url = new URL(request.url);
    const queryUserId = url.searchParams.get("user_id");
    const body = request.method === "DELETE" ? await request.json().catch(() => ({})) : {};
    const targetUserId = (queryUserId || body.user_id || "").trim();

    if (!targetUserId) {
      return jsonError("user_id is required", 400);
    }

    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .eq("organization_id", organizationId)
      .eq("blocked_user_id", targetUserId);

    if (error) {
      return jsonError("Failed to unblock user", 500, error.code, error.message);
    }

    await logModerationAction(supabase, {
      organizationId,
      actorId: user.id,
      actionType: "user_unblocked",
      targetType: "user",
      targetId: targetUserId,
    });

    return jsonSuccess({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonError("Internal server error", 500);
  }
}
