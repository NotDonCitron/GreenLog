import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

export async function POST(request: Request) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;

    const body = await request.json();
    const { name, slug, organization_type, license_number } = body;

    if (!name || !slug || !organization_type) {
        return jsonError("Missing required fields: name, slug, organization_type", 400);
    }

    if (!['club', 'pharmacy'].includes(organization_type)) {
        return jsonError("organization_type must be 'club' or 'pharmacy'", 400);
    }

    const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .insert({
            name,
            slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            organization_type,
            license_number: license_number || null,
            created_by: user.id,
            status: 'active'
        })
        .select()
        .single();

    if (orgError) {
        return jsonError("Failed to create organization", 500, orgError.code, orgError.message);
    }

    const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
            organization_id: organization.id,
            user_id: user.id,
            role: 'gründer',
            membership_status: 'active',
            joined_at: new Date().toISOString()
        });

    if (memberError) {
        await supabase.from("organizations").delete().eq("id", organization.id);

        if (memberError.code === '23505') {
            return jsonError("Du hast bereits eine Community gegründet.", 409);
        }
        return jsonError("Failed to add owner to organization", 500, memberError.code, memberError.message);
    }

    return jsonSuccess({ organization }, 201);
}

export async function GET(request: Request) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;

    const { data: memberships, error } = await supabase
        .from("organization_members")
        .select(`*, organizations (*)`)
        .eq("user_id", user.id)
        .eq("membership_status", "active");

    if (error) {
        return jsonError("Failed to fetch organizations", 500, error.code, error.message);
    }

    return jsonSuccess({ memberships });
}
