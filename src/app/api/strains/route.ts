import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { writeOrganizationActivity } from "@/lib/organization-activities";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

export async function POST(request: Request) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    if (auth instanceof Response) return;
    const { user, supabase } = auth;

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
        return jsonError("Missing required fields: name, slug, type", 400);
    }

    if (!['indica', 'sativa', 'hybrid', 'ruderalis'].includes(type)) {
        return jsonError(
            "type must be one of: indica, sativa, hybrid, ruderalis",
            400
        );
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
        return jsonError("Failed to create strain", 500, strainError.code, strainError.message);
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

    return jsonSuccess({ strain }, 201);
}
