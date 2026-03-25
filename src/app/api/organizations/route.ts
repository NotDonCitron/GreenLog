import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const accessToken = authHeader?.replace("Bearer ", "");

        if (!accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getAuthenticatedClient(accessToken);

        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, slug, organization_type, license_number } = body;

        // Validate required fields
        if (!name || !slug || !organization_type) {
            return NextResponse.json({
                error: "Missing required fields: name, slug, organization_type"
            }, { status: 400 });
        }

        // Validate organization_type
        if (!['club', 'pharmacy'].includes(organization_type)) {
            return NextResponse.json({
                error: "organization_type must be 'club' or 'pharmacy'"
            }, { status: 400 });
        }

        // Create the organization
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
            console.error("Error creating organization:", orgError);
            return NextResponse.json({
                error: "Failed to create organization",
                details: orgError.message
            }, { status: 500 });
        }

        // Add the creator as owner
        const { error: memberError } = await supabase
            .from("organization_members")
            .insert({
                organization_id: organization.id,
                user_id: user.id,
                role: 'owner',
                membership_status: 'active',
                joined_at: new Date().toISOString()
            });

        if (memberError) {
            console.error("Error adding owner to organization:", memberError);
            // Try to clean up the organization
            await supabase.from("organizations").delete().eq("id", organization.id);
            return NextResponse.json({
                error: "Failed to add owner to organization",
                details: memberError.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            organization
        }, { status: 201 });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({
            error: "Internal server error"
        }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const accessToken = authHeader?.replace("Bearer ", "");

        if (!accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getAuthenticatedClient(accessToken);

        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get all organizations the user is a member of
        const { data: memberships, error } = await supabase
            .from("organization_members")
            .select(`
        *,
        organizations (*)
      `)
            .eq("user_id", user.id)
            .eq("membership_status", "active");

        if (error) {
            console.error("Error fetching organizations:", error);
            return NextResponse.json({
                error: "Failed to fetch organizations",
                details: error.message
            }, { status: 500 });
        }

        return NextResponse.json({
            memberships
        });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({
            error: "Internal server error"
        }, { status: 500 });
    }
}
