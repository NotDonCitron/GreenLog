import type { SupabaseClient } from "@supabase/supabase-js";
import { USER_ROLES } from "@/lib/roles";

type DbClient = SupabaseClient;

type MembershipCheckResult =
  | { ok: true; role: string }
  | { ok: false; status: 403 | 500; message: string; code?: string; detail?: string };

export async function requireOrgMembership(
  supabase: DbClient,
  organizationId: string,
  userId: string
): Promise<MembershipCheckResult> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("membership_status", "active")
    .limit(1);

  if (error) {
    return { ok: false, status: 500, message: "Failed to verify membership", code: error.code, detail: error.message };
  }

  const row = data?.[0];
  if (!row) return { ok: false, status: 403, message: "Forbidden" };

  return { ok: true, role: row.role };
}

export function isAdminRole(role: string): boolean {
  return role === USER_ROLES.GRUENDER || role === USER_ROLES.ADMIN;
}

type RestrictionResult = { blocked: false } | { blocked: true; status: 403; message: string };

export async function getUserModerationRestriction(
  supabase: DbClient,
  organizationId: string,
  userId: string
): Promise<RestrictionResult> {
  const { data: blocks } = await supabase
    .from("user_blocks")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("blocked_user_id", userId)
    .limit(1);

  if ((blocks ?? []).length > 0) {
    return { blocked: true, status: 403, message: "Your account is blocked in this club" };
  }

  const { data: mutes } = await supabase
    .from("club_mutes")
    .select("expires_at")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .limit(1);

  const mute = mutes?.[0];
  if (!mute) return { blocked: false };

  if (!mute.expires_at) {
    return { blocked: true, status: 403, message: "Your account is muted in this club" };
  }

  if (new Date(mute.expires_at).getTime() > Date.now()) {
    return { blocked: true, status: 403, message: "Your account is muted in this club" };
  }

  return { blocked: false };
}

type RateLimitResult = { limited: false } | { limited: true; status: 429; message: string };

export async function checkUpdatePostRateLimit(
  supabase: DbClient,
  organizationId: string,
  userId: string
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("club_update_posts")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("author_id", userId)
    .gte("created_at", since)
    .limit(10);

  if ((data ?? []).length >= 10) {
    return { limited: true, status: 429, message: "Rate limit exceeded: max 10 update posts per hour" };
  }

  return { limited: false };
}

export async function checkReportRateLimit(
  supabase: DbClient,
  organizationId: string,
  userId: string
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [{ data: contentReports }, { data: userReports }] = await Promise.all([
    supabase
      .from("content_reports")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("reporter_id", userId)
      .gte("created_at", since)
      .limit(15),
    supabase
      .from("user_reports")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("reporter_id", userId)
      .gte("created_at", since)
      .limit(15),
  ]);

  const total = (contentReports ?? []).length + (userReports ?? []).length;
  if (total >= 15) {
    return { limited: true, status: 429, message: "Rate limit exceeded: max 15 reports per hour" };
  }

  return { limited: false };
}

type AuditAction =
  | "content_report_created"
  | "user_report_created"
  | "content_hidden"
  | "content_removed"
  | "user_blocked"
  | "user_unblocked"
  | "user_muted"
  | "user_unmuted"
  | "report_resolved";

type AuditTarget =
  | "club_update_post"
  | "community_feed"
  | "user"
  | "content_report"
  | "user_report"
  | "club_mute"
  | "user_block";

export async function logModerationAction(
  supabase: DbClient,
  input: {
    organizationId: string;
    actorId: string;
    actionType: AuditAction;
    targetType: AuditTarget;
    targetId: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase.from("moderation_actions").insert({
    organization_id: input.organizationId,
    actor_id: input.actorId,
    action_type: input.actionType,
    target_type: input.targetType,
    target_id: input.targetId,
    details: input.details ?? {},
  });

  if (error) {
    console.warn("Failed to log moderation action", error.code, error.message);
  }
}
