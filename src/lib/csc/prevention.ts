import type { SupabaseClient } from "@supabase/supabase-js";
import type { CscPreventionConsent } from "@/lib/types";

export interface PreventionReadInput {
  organizationId: string;
  memberId: string;
  requesterId: string;
  scope: string;
}

export function getPreventionConsentQuery(
  supabase: SupabaseClient,
  organizationId: string,
  memberId: string,
) {
  return supabase
    .from("prevention_consents")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("member_id", memberId)
    .is("revoked_at", null);
}

export function getPreventionRatingsQuery(
  supabase: SupabaseClient,
  organizationId: string,
  memberId: string,
) {
  return supabase
    .from("ratings")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", memberId)
    .eq("is_club_feedback", true);
}

export async function canViewPreventionData(
  supabase: SupabaseClient,
  input: PreventionReadInput,
): Promise<boolean> {
  const [{ data: membership }, { data: consents }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role, membership_status")
      .eq("organization_id", input.organizationId)
      .eq("user_id", input.requesterId)
      .eq("membership_status", "active")
      .maybeSingle(),
    getPreventionConsentQuery(supabase, input.organizationId, input.memberId),
  ]);

  if (!membership || membership.role !== "präventionsbeauftragter") {
    return false;
  }

  const now = Date.now();
  return Boolean(
    consents?.some((consent: CscPreventionConsent) => {
      if (consent.granted_to_role !== "präventionsbeauftragter") return false;
      if (!consent.data_scopes.includes(input.scope)) return false;
      if (consent.revoked_at) return false;
      if (!consent.expires_at) return true;

      const expiresAt = Date.parse(consent.expires_at);
      return Number.isFinite(expiresAt) && expiresAt > now;
    }),
  );
}
