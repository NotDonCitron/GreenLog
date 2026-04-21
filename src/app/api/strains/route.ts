import { getAuthenticatedClient } from "@/lib/supabase/client";
import { writeOrganizationActivity } from "@/lib/organization-activities";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search");

    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof Response) return auth;
    const { supabase } = auth;

    let query = supabase
        .from("strains")
        .select("id, name, slug, type, farmer, thc_min, thc_max, cbd_min, cbd_max, image_url, effects, flavors, description, terpenes, created_at")
        .eq("publication_status", "published")
        .range(offset, offset + limit - 1)
        .order("name", { ascending: true });

    if (search) {
        query = query.ilike("name", `%${search}%`);
    }

    // Only show strains with real images (no placeholders / null)
    query = query.not("image_url", "ilike", "%placeholder%")
                 .not("image_url", "ilike", "%picsum%")
                 .not("image_url", "is", null);

    const { data: strains, error } = await query;
    if (error) return jsonError("Failed to fetch strains", 500, error.code, error.message);

    return jsonSuccess({ strains });
}

export async function POST(request: Request) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    if (auth instanceof Response) return auth;
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
        primary_source,
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

    const resolvedPrimarySource =
        typeof primary_source === "string" && primary_source.trim().length > 0
            ? primary_source.trim()
            : typeof source === "string" && source.trim().length > 0
              ? source.trim()
              : "manual-user";

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
            publication_status: "draft",
            primary_source: resolvedPrimarySource,
            created_by: user.id,
        })
        .select()
        .single();

    if (strainError) {
        console.error("Error creating strain:", strainError);
        return jsonError("Failed to create strain", 500, strainError.code, strainError.message);
    }

    // Write activity for organization strains (skip for personal strains without org)
    let activityError = null;
    if (strain.organization_id) {
        console.log('[DEBUG] Attempting to write activity for strain:', strain.name, 'org:', strain.organization_id, 'user:', user.id);
        const actErr = await writeOrganizationActivity({
            supabase,
            organizationId: strain.organization_id,
            userId: user.id,
            eventType: 'strain_added',
            targetType: 'strain',
            target: { id: strain.id, name: strain.name },
            metadata: { type: strain.type, thc_max: strain.thc_max },
        });
        if (actErr) {
            console.error('[DEBUG] Activity write failed:', actErr.error);
            activityError = actErr.error;
        }

        // community_feed is written by the database trigger on strains.
    }

    return jsonSuccess({ strain, activityError }, 201);
}
