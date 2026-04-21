export function mergeStrainRecords(records) {
  const bySlug = new Map();
  const byName = new Map();

  for (const record of records) {
    const slugKey = record.slug.toLowerCase();
    const nameKey = record.normalizedName;

    if (!bySlug.has(slugKey)) {
      bySlug.set(slugKey, []);
    }
    bySlug.get(slugKey).push(record);

    if (nameKey && nameKey !== slugKey) {
      if (!byName.has(nameKey)) {
        byName.set(nameKey, []);
      }
      byName.get(nameKey).push(record);
    }
  }

  const seen = new Set();
  const merged = [];

  for (const [slugKey, group] of bySlug) {
    if (seen.has(slugKey)) continue;
    seen.add(slugKey);

    const nameGroup = byName.get(group[0]?.normalizedName) || [];
    const allRecords = [...group];
    for (const r of nameGroup) {
      if (r.slug.toLowerCase() !== slugKey) continue;
      if (!allRecords.includes(r)) allRecords.push(r);
    }

    const consolidated = consolidateStrain(allRecords);
    if (consolidated) merged.push(consolidated);
  }

  return merged;
}

function consolidateStrain(records) {
  if (!records.length) return null;

  const FIELDS = ['type', 'description', 'thc_min', 'thc_max', 'cbd_min', 'cbd_max', 'terpenes', 'flavors', 'effects', 'image_url'];

  const bestName = pickBestField(records, 'name');
  const bestSlug = pickBestField(records, 'slug');

  const bestFields = {};
  const sourceProvenance = {};
  const conflicts = [];

  for (const field of FIELDS) {
    const { value, source, score } = pickBestFieldWithSource(records, field);
    bestFields[field] = value;

    sourceProvenance[field] = {
      source,
      confidence: score,
      updated_at: new Date().toISOString(),
    };

    const nonNullRecords = records.filter(r => r[field]?.value != null && r[field]?.confidence > 0);
    if (nonNullRecords.length > 1) {
      const values = nonNullRecords.map(r => JSON.stringify(r[field].value));
      const uniqueValues = [...new Set(values)];
      if (uniqueValues.length > 1) {
        conflicts.push({
          field,
          candidates: nonNullRecords.map(r => ({
            source: r.source,
            value: r[field].value,
            score: r.sourceWeight * r[field].confidence,
          })),
          resolved: source,
        });
      }
    }
  }

  const imageCandidates = records
    .filter(r => r.image_url?.value)
    .sort((a, b) => (b.sourceWeight * b.image_url.confidence) - (a.sourceWeight * a.image_url.confidence))
    .map(r => ({ url: r.image_url.value, source: r.source }));

  const terpenes = unionArrays(records.map(r => r.terpenes?.value).filter(Boolean));
  const flavors = unionArrays(records.map(r => r.flavors?.value).filter(Boolean));
  const effects = unionArrays(records.map(r => r.effects?.value).filter(Boolean));

  return {
    name: bestName,
    slug: bestSlug,
    normalizedName: records[0]?.normalizedName || '',
    type: bestFields.type,
    description: bestFields.description,
    thc_min: bestFields.thc_min,
    thc_max: bestFields.thc_max,
    cbd_min: bestFields.cbd_min,
    cbd_max: bestFields.cbd_max,
    terpenes,
    flavors,
    effects,
    image_url: bestFields.image_url,
    imageSources: imageCandidates,
    sourceProvenance,
    conflicts,
  };
}

function pickBestField(records, field) {
  for (const r of records) {
    const val = field === 'name' ? r.name : field === 'slug' ? r.slug : r[field]?.value;
    if (val) return val;
  }
  return null;
}

function pickBestFieldWithSource(records, field) {
  let bestValue = null;
  let bestSource = null;
  let bestScore = -1;

  for (const r of records) {
    const fieldData = r[field];
    if (!fieldData || fieldData.value == null) continue;
    const score = r.sourceWeight * fieldData.confidence;
    if (score > bestScore) {
      bestScore = score;
      bestValue = fieldData.value;
      bestSource = r.source;
    }
  }

  return { value: bestValue, source: bestSource, score: bestScore };
}

function unionArrays(arrays) {
  const seen = new Set();
  const result = [];
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const key = String(item).toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(key);
      }
    }
  }
  return result;
}
