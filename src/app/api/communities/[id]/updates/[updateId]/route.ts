import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import type { ClubUpdatePostUpdateInput, ClubUpdatePostType, ClubUpdateModerationStatus } from "@/lib/types";
import {
  getUserModerationRestriction,
  isAdminRole,
  logModerationAction,
  requireOrgMembership,
} from "@/lib/moderation";

type RouteParams = { params: Promise<{ id: string; updateId: string }> };

const VALID_POST_TYPES: Set<string> = new Set([
  "announcement",
  "event",
  "compliance_notice",
  "documentation_note",
  "strain_info",
  "club_info",
  "system_notice",
  "poll_notice",
]);

const VALID_MODERATION_STATUSES: Set<string> = new Set(["active", "hidden", "removed"]);

const PROHIBITED_PATTERNS = [
  /\d+(?:[.,]\d{1,2})?\s*(€|EUR|euro)/i,
  /\b(preis|verkauf|kauf|bestand|verfügbar|vorrätig|lager)\b.*\b\d\b/i,
  /\b(abholung|pickup|lieferung|delivery|zustellung|versand)\b/i,
  /\b(whatsapp|telegram|signal)\b/i,
  /\+\d{1,3}[\s\d-]{8,}/,
  /\b(heilt|heilung|medizin.*ersetzt|ersetzt.*medikament)\b/i,
  /\b(minderjährig|unter\s*18|jugendlich)\b/i,
];

function validateContent(text: string): string | null {
  for (const pattern of PROHIBITED_PATTERNS) {
    if (pattern.test(text)) {
      return "Content contains prohibited language (price, contact, delivery, medical claim, or minor-directed content)";
    }
  }
  return null;
}

const SELECT_FIELDS = "id, organization_id, author_id, post_type, title, body, metadata, visibility, moderation_status, hidden_at, hidden_by, removed_at, removed_by, created_at, updated_at";

// PATCH /api/communities/[id]/updates/[updateId]
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;

    const { id: organizationId, updateId } = await params;

    const membership = await requireOrgMembership(supabase, organizationId, user.id);
    if (!membership.ok) {
      return jsonError(membership.message, membership.status, membership.code, membership.detail);
    }
    if (!isAdminRole(membership.role)) {
      return jsonError("Forbidden", 403);
    }

    const restriction = await getUserModerationRestriction(supabase, organizationId, user.id);
    if (restriction.blocked) {
      return jsonError(restriction.message, restriction.status);
    }

    const body = await request.json();
    const updates: ClubUpdatePostUpdateInput = {};

    if (body.post_type !== undefined) {
      if (!VALID_POST_TYPES.has(body.post_type)) {
        return jsonError("Invalid post_type", 400);
      }
      updates.post_type = body.post_type as ClubUpdatePostType;
    }

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || body.title.trim().length < 3 || body.title.trim().length > 160) {
        return jsonError("Title must be between 3 and 160 characters", 400);
      }
      updates.title = body.title.trim();
    }

    if (body.body !== undefined) {
      if (typeof body.body !== "string" || body.body.trim().length < 1 || body.body.trim().length > 5000) {
        return jsonError("Body must be between 1 and 5000 characters", 400);
      }
      updates.body = body.body.trim();
    }

    if (body.metadata !== undefined) {
      updates.metadata = body.metadata;
    }

    if (body.moderation_status !== undefined) {
      if (!VALID_MODERATION_STATUSES.has(body.moderation_status)) {
        return jsonError("Invalid moderation_status", 400);
      }
      updates.moderation_status = body.moderation_status as ClubUpdateModerationStatus;
    }

    if (Object.keys(updates).length === 0) {
      return jsonError("No valid fields to update", 400);
    }

    const contentToValidate = [updates.title, updates.body].filter(Boolean).join(" ");
    if (contentToValidate) {
      const validationError = validateContent(contentToValidate);
      if (validationError) {
        return jsonError(validationError, 422);
      }
    }

    const patchData: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };

    if (updates.moderation_status === "hidden") {
      patchData.hidden_at = new Date().toISOString();
      patchData.hidden_by = user.id;
    }

    if (updates.moderation_status === "removed") {
      patchData.removed_at = new Date().toISOString();
      patchData.removed_by = user.id;
    }

    const { data: post, error: updateError } = await supabase
      .from("club_update_posts")
      .update(patchData)
      .eq("id", updateId)
      .eq("organization_id", organizationId)
      .select(SELECT_FIELDS)
      .single();

    if (updateError) {
      return jsonError("Failed to update post", 500, updateError.code, updateError.message);
    }

    if (!post) {
      return jsonError("Post not found", 404);
    }

    if (updates.moderation_status === "hidden") {
      await logModerationAction(supabase, {
        organizationId,
        actorId: user.id,
        actionType: "content_hidden",
        targetType: "club_update_post",
        targetId: updateId,
        details: { moderation_status: "hidden" },
      });
    }

    if (updates.moderation_status === "removed") {
      await logModerationAction(supabase, {
        organizationId,
        actorId: user.id,
        actionType: "content_removed",
        targetType: "club_update_post",
        targetId: updateId,
        details: { moderation_status: "removed" },
      });
    }

    return jsonSuccess(post);
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonError("Internal server error", 500);
  }
}

// DELETE /api/communities/[id]/updates/[updateId] (soft-remove)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;

    const { id: organizationId, updateId } = await params;

    const membership = await requireOrgMembership(supabase, organizationId, user.id);
    if (!membership.ok) {
      return jsonError(membership.message, membership.status, membership.code, membership.detail);
    }
    if (!isAdminRole(membership.role)) {
      return jsonError("Forbidden", 403);
    }

    const restriction = await getUserModerationRestriction(supabase, organizationId, user.id);
    if (restriction.blocked) {
      return jsonError(restriction.message, restriction.status);
    }

    const { data: post, error: updateError } = await supabase
      .from("club_update_posts")
      .update({
        moderation_status: "removed",
        removed_at: new Date().toISOString(),
        removed_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updateId)
      .eq("organization_id", organizationId)
      .eq("moderation_status", "active")
      .select(SELECT_FIELDS)
      .single();

    if (updateError) {
      return jsonError("Failed to remove post", 500, updateError.code, updateError.message);
    }

    if (!post) {
      return jsonError("Post not found or already removed", 404);
    }

    await logModerationAction(supabase, {
      organizationId,
      actorId: user.id,
      actionType: "content_removed",
      targetType: "club_update_post",
      targetId: updateId,
      details: { path: "delete_route" },
    });

    return jsonSuccess(post);
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonError("Internal server error", 500);
  }
}
