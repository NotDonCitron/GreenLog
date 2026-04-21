/**
 * GreenLog Canon Ingest — Database Layer
 * 
 * Handles Supabase upserts with conflict resolution on `slug`.
 * Uses Service Role Key to bypass RLS for administrative inserts.
 * All new entries get `publication_status = 'draft'`.
 */

/**
 * Check if a strain with the given slug already exists.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} slug
 * @returns {Promise<{id: string, name: string}|null>}
 */
async function findBySlug(supabase, slug) {
    const { data } = await supabase
        .from('strains')
        .select('id, name')
        .eq('slug', slug)
        .limit(1);
    return data && data.length > 0 ? data[0] : null;
}

/**
 * Upsert a validated strain into the database.
 * - New records: insert with publication_status='draft'
 * - Existing records (by slug): update enrichment fields only
 * 
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} strain - Canonical strain object that passed the Publish Gate
 * @returns {Promise<{action: 'inserted'|'updated'|'error', id?: string, error?: string}>}
 */
export async function upsertStrain(supabase, strain) {
    try {
        const existing = await findBySlug(supabase, strain.slug);

        if (existing) {
            const { error } = await supabase
                .from('strains')
                .update({
                    description: strain.description,
                    thc_min: strain.thc_min,
                    thc_max: strain.thc_max,
                    cbd_min: strain.cbd_min,
                    cbd_max: strain.cbd_max,
                    terpenes: strain.terpenes,
                    flavors: strain.flavors,
                    effects: strain.effects,
                    image_url: strain.image_url,
                    primary_source: strain.source,
                })
                .eq('id', existing.id);

            if (error) return { action: 'error', error: error.message };
            return { action: 'updated', id: existing.id };
        }

        const { data, error } = await supabase
            .from('strains')
            .insert({
                name: strain.name,
                slug: strain.slug,
                type: strain.type,
                description: strain.description,
                thc_min: strain.thc_min,
                thc_max: strain.thc_max,
                cbd_min: strain.cbd_min,
                cbd_max: strain.cbd_max,
                terpenes: strain.terpenes,
                flavors: strain.flavors,
                effects: strain.effects,
                image_url: strain.image_url,
                publication_status: 'draft',
                primary_source: strain.source,
            })
            .select('id')
            .single();

        if (error) return { action: 'error', error: error.message };
        return { action: 'inserted', id: data?.id };

    } catch (err) {
        return { action: 'error', error: err.message };
    }
}
