import { authenticateRequest, jsonError, jsonSuccess } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { isAdminRole, logModerationAction, requireOrgMembership } from "@/lib/moderation";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(_request, getAuthenticatedClient);
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
      .from("club_mutes")
      .select("id, organization_id, user_id, muted_by, reason, expires_at, created_at, updated_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      return jsonError("Failed to fetch mutes", 500, error.code, error.message);
    }

    return jsonSuccess({ mutes: data ?? [] });
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
    const expiresAt = typeof body.expires_at === "string" ? body.expires_at : null;

    if (!targetUserId) {
      return jsonError("user_id is required", 400);
    }
    if (targetUserId === user.id) {
      return jsonError("You cannot mute yourself", 400);
    }
    if (reason && reason.length > 500) {
      return jsonError("Reason cannot exceed 500 characters", 400);
    }
    if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) {
      return jsonError("Invalid expires_at timestamp", 400);
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
      .from("club_mutes")
      .upsert(
        {
          organization_id: organizationId,
          user_id: targetUserId,
          muted_by: user.id,
          reason,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,user_id" }
      )
      .select("id, organization_id, user_id, muted_by, reason, expires_at, created_at, updated_at")
      .single();

    if (error) {
      return jsonError("Failed to mute user", 500, error.code, error.message);
    }

    await logModerationAction(supabase, {
      organizationId,
      actorId: user.id,
      actionType: "user_muted",
      targetType: "club_mute",
      targetId: data.id,
      details: { user_id: targetUserId, expires_at: expiresAt },
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
      .from("club_mutes")
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", targetUserId);

    if (error) {
      return jsonError("Failed to unmute user", 500, error.code, error.message);
    }

    await logModerationAction(supabase, {
      organizationId,
      actorId: user.id,
      actionType: "user_unmuted",
      targetType: "user",
      targetId: targetUserId,
    });

    return jsonSuccess({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonError("Internal server error", 500);
  }
}
