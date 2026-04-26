import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import type { ClubUpdatePostCreateInput, ClubUpdatePostType } from "@/lib/types";
import {
  checkUpdatePostRateLimit,
  getUserModerationRestriction,
  isAdminRole,
  requireOrgMembership,
} from "@/lib/moderation";

type RouteParams = { params: Promise<{ id: string }> };

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

// GET /api/communities/[id]/updates
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;

    const { id: organizationId } = await params;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const membership = await requireOrgMembership(supabase, organizationId, user.id);
    if (!membership.ok) {
      return jsonError(membership.message, membership.status, membership.code, membership.detail);
    }
    if (!isAdminRole(membership.role)) {
      return jsonError("Forbidden", 403);
    }

    const postType = searchParams.get("post_type");
    let query = supabase
      .from("club_update_posts")
      .select("id, organization_id, author_id, post_type, title, body, metadata, visibility, moderation_status, hidden_at, hidden_by, removed_at, removed_by, created_at, updated_at", { count: "exact" })
      .eq("organization_id", organizationId)
      .eq("moderation_status", "active")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (postType && VALID_POST_TYPES.has(postType)) {
      query = query.eq("post_type", postType as ClubUpdatePostType);
    }

    const { data: posts, error: fetchError, count } = await query;

    if (fetchError) {
      return jsonError("Failed to fetch updates", 500, fetchError.code, fetchError.message);
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return jsonSuccess({
      posts: posts ?? [],
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonError("Internal server error", 500);
  }
}

// POST /api/communities/[id]/updates
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

    const restriction = await getUserModerationRestriction(supabase, organizationId, user.id);
    if (restriction.blocked) {
      return jsonError(restriction.message, restriction.status);
    }

    const postRateLimit = await checkUpdatePostRateLimit(supabase, organizationId, user.id);
    if (postRateLimit.limited) {
      return jsonError(postRateLimit.message, postRateLimit.status);
    }

    const body = await request.json();
    const { post_type, title, body: postBody, metadata } = body as Partial<ClubUpdatePostCreateInput>;

    if (!post_type || !VALID_POST_TYPES.has(post_type)) {
      return jsonError("Invalid post_type", 400);
    }

    if (!title || typeof title !== "string" || title.trim().length < 3 || title.trim().length > 160) {
      return jsonError("Title must be between 3 and 160 characters", 400);
    }

    if (!postBody || typeof postBody !== "string" || postBody.trim().length < 1 || postBody.trim().length > 5000) {
      return jsonError("Body must be between 1 and 5000 characters", 400);
    }

    const validationError = validateContent(title + " " + postBody);
    if (validationError) {
      return jsonError(validationError, 422);
    }

    const { data: post, error: insertError } = await supabase
      .from("club_update_posts")
      .insert({
        organization_id: organizationId,
        author_id: user.id,
        post_type,
        title: title.trim(),
        body: postBody.trim(),
        metadata: metadata ?? {},
        visibility: "club_only",
        moderation_status: "active",
      })
      .select("id, organization_id, author_id, post_type, title, body, metadata, visibility, moderation_status, hidden_at, hidden_by, removed_at, removed_by, created_at, updated_at")
      .single();

    if (insertError) {
      return jsonError("Failed to create update", 500, insertError.code, insertError.message);
    }

    return jsonSuccess(post, 201);
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonError("Internal server error", 500);
  }
}
