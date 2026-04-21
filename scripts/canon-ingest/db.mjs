export async function upsertStrain(supabase, strain, gateResult, imageResult = null) {
  try {
    const existing = await findBySlug(supabase, strain.slug);

    const imageUrl = imageResult?.publicUrl || strain.image_url || null;
    const canonicalImagePath = imageResult?.storagePath || null;

    const sourceProvenance = strain.sourceProvenance || {};
    if (imageResult?.ok) {
      sourceProvenance.image_url = {
        source: imageResult.attribution?.source || 'unknown',
        confidence: 1.0,
        updated_at: new Date().toISOString(),
        attribution: imageResult.attribution,
      };
    }

    if (existing) {
      return updateExistingStrain(supabase, existing, strain, gateResult, imageUrl, canonicalImagePath, sourceProvenance);
    }

    return insertNewStrain(supabase, strain, imageUrl, canonicalImagePath, sourceProvenance);
  } catch (err) {
    return { action: 'error', error: err.message };
  }
}

async function updateExistingStrain(supabase, existing, strain, gateResult, imageUrl, canonicalImagePath, sourceProvenance) {
  const update = {};
  const fields = gateResult.fieldsToUpdate;

  const fieldMap = {
    type: strain.type,
    description: strain.description,
    thc_min: strain.thc_min,
    thc_max: strain.thc_max,
    cbd_min: strain.cbd_min,
    cbd_max: strain.cbd_max,
    terpenes: strain.terpenes,
    flavors: strain.flavors,
    effects: strain.effects,
    image_url: imageUrl,
  };

  for (const field of fields) {
    if (fieldMap[field] != null) {
      update[field] = fieldMap[field];
    }
  }

  if (canonicalImagePath) update.canonical_image_path = canonicalImagePath;
  if (imageUrl) update.image_url = imageUrl;

  const mergedProvenance = mergeProvenance(existing.source_provenance, sourceProvenance);
  update.source_provenance = mergedProvenance;
  update.quality_score = strain.qualityScore;

  if (Object.keys(update).length === 0) {
    return { action: 'skipped', reason: 'no_fields_to_update' };
  }

  const { error } = await supabase
    .from('strains')
    .update(update)
    .eq('id', existing.id);

  if (error) return { action: 'error', error: error.message };
  return { action: 'updated', id: existing.id };
}

async function insertNewStrain(supabase, strain, imageUrl, canonicalImagePath, sourceProvenance) {
  const row = {
    name: strain.name,
    slug: strain.slug,
    type: strain.type,
    description: strain.description,
    thc_min: strain.thc_min,
    thc_max: strain.thc_max,
    cbd_min: strain.cbd_min,
    cbd_max: strain.cbd_max,
    terpenes: strain.terpenes || [],
    flavors: strain.flavors || [],
    effects: strain.effects || [],
    image_url: imageUrl,
    canonical_image_path: canonicalImagePath,
    publication_status: 'draft',
    primary_source: strain.sourceProvenance?.type?.source || null,
    quality_score: strain.qualityScore,
    source_provenance: sourceProvenance,
  };

  const { data, error } = await supabase
    .from('strains')
    .insert(row)
    .select('id')
    .single();

  if (error) return { action: 'error', error: error.message };
  return { action: 'inserted', id: data?.id };
}

function mergeProvenance(existingProvenance, newProvenance) {
  const existing = typeof existingProvenance === 'string'
    ? JSON.parse(existingProvenance)
    : (existingProvenance || {});
  const incoming = newProvenance || {};

  const merged = { ...existing };
  for (const [field, data] of Object.entries(incoming)) {
    const currentConfidence = merged[field]?.confidence ?? 0;
    const newConfidence = data.confidence ?? 0;
    if (newConfidence > currentConfidence) {
      merged[field] = data;
    }
  }
  return merged;
}

async function findBySlug(supabase, slug) {
  const { data } = await supabase
    .from('strains')
    .select('id, name, slug, type, description, thc_min, thc_max, cbd_min, cbd_max, terpenes, flavors, effects, image_url, publication_status, canonical_image_path, quality_score, source_provenance')
    .eq('slug', slug)
    .limit(1);
  return data && data.length > 0 ? data[0] : null;
}

export async function preloadExistingRows(supabase) {
  const cache = { slugs: new Map(), names: new Map() };
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('strains')
      .select('id, slug, name, publication_status, quality_score')
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      if (row.slug) cache.slugs.set(row.slug.toLowerCase(), row);
      if (row.name) cache.names.set(normalizeName(row.name), row);
    }
    offset += pageSize;
  }

  console.log(`  📦 Preloaded ${cache.slugs.size} existing strains`);
  return cache;
}

function normalizeName(name) {
  return String(name ?? '').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}
