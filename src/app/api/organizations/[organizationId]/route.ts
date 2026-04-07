import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { sanitizeSlug } from "@/lib/sanitize";
import { USER_ROLES, ORG_STATUS_VALUES } from "@/lib/roles";

type RouteParams = { params: Promise<{ organizationId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    if (auth instanceof Response) return;
    const { user, supabase } = auth;
    const { organizationId } = await params;

    const { data: membership, error: membershipError } = await supabase
        .from("organization_members")
        .select("role, membership_status")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .single();

    if (membershipError || !membership) {
        return jsonError("Forbidden", 403);
    }

    const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", organizationId)
        .single();

    if (orgError || !organization) {
        return jsonError("Organization not found", 404);
    }

    return jsonSuccess({ organization, user_role: membership.role });
}

export async function PATCH(request: Request, { params }: RouteParams) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    if (auth instanceof Response) return;
    const { user, supabase } = auth;
    const { organizationId } = await params;

    const { data: membership, error: membershipError } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .single();

    if (membershipError || !membership) {
        return jsonError("Forbidden", 403);
    }

    if (membership.role !== "gründer" && membership.role !== "admin") {
        return jsonError("Forbidden", 403);
    }

    const body = await request.json();
    const { name, slug, license_number, status } = body;

    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (slug) {
        updates.slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }
    if (license_number !== undefined) updates.license_number = license_number;

    if (status !== undefined && membership.role === "gründer") {
        if (["active", "inactive", "suspended"].includes(status)) {
            updates.status = status;
        }
    }

    if (Object.keys(updates).length === 0) {
        return jsonError("No valid updates provided", 400);
    }

    const { data: updated, error: updateError } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", organizationId)
        .select()
        .single();

    if (updateError) {
        return jsonError("Failed to update organization", 500, updateError.code, updateError.message);
    }

    return jsonSuccess({ organization: updated });
}

export async function DELETE(request: Request, { params }: RouteParams) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    if (auth instanceof Response) return;
    const { user, supabase } = auth;
    const { organizationId } = await params;

    const { data: membership, error: membershipError } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .single();

    if (membershipError || !membership) {
        return jsonError("Forbidden", 403);
    }

    if (membership.role !== "gründer") {
        return jsonError("Nur der Owner kann die Community löschen", 403);
    }

    const { error: deleteError } = await supabase
        .from("organizations")
        .delete()
        .eq("id", organizationId);

    if (deleteError) {
        return jsonError("Failed to delete organization", 500, deleteError.code, deleteError.message);
    }

    return jsonSuccess({ success: true });
}
