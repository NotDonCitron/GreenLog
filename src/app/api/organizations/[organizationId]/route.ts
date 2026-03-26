import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";

type RouteParams = { params: Promise<{ organizationId: string }> };

// GET /api/organizations/[organizationId]
// Get organization details
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { organizationId } = await params;
        const authHeader = request.headers.get("Authorization");
        const accessToken = authHeader?.replace("Bearer ", "");

        if (!accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getAuthenticatedClient(accessToken);

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is a member
        const { data: membership, error: membershipError } = await supabase
            .from("organization_members")
            .select("role, membership_status")
            .eq("organization_id", organizationId)
            .eq("user_id", user.id)
            .eq("membership_status", "active")
            .single();

        if (membershipError || !membership) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { data: organization, error: orgError } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", organizationId)
            .single();

        if (orgError || !organization) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        return NextResponse.json({
            organization,
            user_role: membership.role
        });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH /api/organizations/[organizationId]
// Update organization details (name, slug, etc.)
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { organizationId } = await params;
        const authHeader = request.headers.get("Authorization");
        const accessToken = authHeader?.replace("Bearer ", "");

        if (!accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getAuthenticatedClient(accessToken);

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is org manager (gründer or admin)
        const { data: membership, error: membershipError } = await supabase
            .from("organization_members")
            .select("role")
            .eq("organization_id", organizationId)
            .eq("user_id", user.id)
            .eq("membership_status", "active")
            .single();

        if (membershipError || !membership) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (membership.role !== "gründer" && membership.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { name, slug, license_number, status } = body;

        // Build update payload
        const updates: Record<string, any> = {};
        if (name) updates.name = name;
        if (slug) {
            updates.slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        }
        if (license_number !== undefined) updates.license_number = license_number;

        // Only gründer can change status or license_number
        if (status !== undefined && membership.role === "gründer") {
            if (["active", "inactive", "suspended"].includes(status)) {
                updates.status = status;
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
        }

        const { data: updated, error: updateError } = await supabase
            .from("organizations")
            .update(updates)
            .eq("id", organizationId)
            .select()
            .single();

        if (updateError) {
            console.error("Error updating organization:", updateError);
            return NextResponse.json({
                error: "Failed to update organization",
                details: updateError.message
            }, { status: 500 });
        }

        return NextResponse.json({ organization: updated });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/organizations/[organizationId]
// Delete (archive) an organization — gründer only
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { organizationId } = await params;
        const authHeader = request.headers.get("Authorization");
        const accessToken = authHeader?.replace("Bearer ", "");

        if (!accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getAuthenticatedClient(accessToken);

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Must be gründer to delete
        const { data: membership, error: membershipError } = await supabase
            .from("organization_members")
            .select("role")
            .eq("organization_id", organizationId)
            .eq("user_id", user.id)
            .eq("membership_status", "active")
            .single();

        if (membershipError || !membership) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (membership.role !== "gründer") {
            return NextResponse.json({ error: "Nur der Owner kann die Community löschen" }, { status: 403 });
        }

        // Delete organization (cascade should handle members via DB constraints)
        const { error: deleteError } = await supabase
            .from("organizations")
            .delete()
            .eq("id", organizationId);

        if (deleteError) {
            console.error("Error deleting organization:", deleteError);
            return NextResponse.json({
                error: "Failed to delete organization",
                details: deleteError.message
            }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
