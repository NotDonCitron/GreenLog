import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { writeOrganizationActivity } from "@/lib/organization-activities";

export async function POST(request: Request) {
    try {
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

        const body = await request.json();
        const {
            name,
            slug,
            type,
            thc_min,
            thc_max,
            cbd_min,
            cbd_max,
            effects,
            flavors,
            description,
            organization_id,
            is_custom,
            source,
        } = body;

        if (!name || !slug || !type) {
            return NextResponse.json({
                error: "Missing required fields: name, slug, type"
            }, { status: 400 });
        }

        if (!['indica', 'sativa', 'hybrid', 'ruderalis'].includes(type)) {
            return NextResponse.json({
                error: "type must be one of: indica, sativa, hybrid, ruderalis"
            }, { status: 400 });
        }

        const { data: strain, error: strainError } = await supabase
            .from("strains")
            .insert({
                name,
                slug,
                type,
                thc_min: thc_min ?? null,
                thc_max: thc_max ?? null,
                cbd_min: cbd_min ?? null,
                cbd_max: cbd_max ?? null,
                effects: effects ?? null,
                flavors: flavors ?? null,
                description: description ?? null,
                organization_id: organization_id ?? null,
                is_custom: is_custom ?? false,
                source: source ?? 'pharmacy',
                created_by: user.id,
            })
            .select()
            .single();

        if (strainError) {
            console.error("Error creating strain:", strainError);
            return NextResponse.json({
                error: "Failed to create strain",
                details: strainError.message
            }, { status: 500 });
        }

        // Write activity for organization strains (skip for personal strains without org)
        if (strain.organization_id) {
            await writeOrganizationActivity({
                supabase,
                organizationId: strain.organization_id,
                userId: user.id,
                eventType: 'strain_added',
                targetType: 'strain',
                target: { id: strain.id, name: strain.name },
                metadata: { type: strain.type, thc_max: strain.thc_max },
            }).catch(err => console.error('Activity write failed:', err));
        }

        return NextResponse.json({
            success: true,
            strain
        }, { status: 201 });

    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({
            error: "Internal server error"
        }, { status: 500 });
    }
}
