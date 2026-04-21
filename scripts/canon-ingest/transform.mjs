import { calculateFieldConfidence } from './quality.mjs';

export function slugify(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/#/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeType(type) {
  if (!type || typeof type !== 'string') return null;
  const lower = type.toLowerCase().trim();
  if (lower === 'indica' || lower.startsWith('indica')) return 'indica';
  if (lower === 'sativa' || lower.startsWith('sativa')) return 'sativa';
  if (lower === 'hybrid') return 'hybrid';
  return null;
}

function dedupeArray(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const result = [];
  for (const item of arr) {
    const raw = typeof item === 'object' && item !== null
      ? (item.name || item.terpene || item.label || '')
      : String(item);
    const lower = raw.toLowerCase().trim();
    if (lower && !seen.has(lower)) {
      seen.add(lower);
      result.push(lower);
    }
  }
  return result;
}

function toNumber(val) {
  if (val == null) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function wrapField(field, value) {
  return {
    value,
    confidence: calculateFieldConfidence(field, value),
  };
}

export function transformRawStrain(raw, sourceName, sourceWeight = 0.8) {
  const name = (raw.name || '').trim();
  let thc_min = null, thc_max = null;
  if (raw.thc && typeof raw.thc === 'object' && 'min' in raw.thc) {
    thc_min = toNumber(raw.thc.min);
    thc_max = toNumber(raw.thc.max);
  } else if (raw.thc_min != null || raw.thc_max != null) {
    thc_min = toNumber(raw.thc_min);
    thc_max = toNumber(raw.thc_max);
  } else if (raw.thc_percent != null) {
    thc_min = toNumber(raw.thc_percent);
    thc_max = toNumber(raw.thc_percent);
  } else if (typeof raw.thc === 'number') {
    thc_min = raw.thc;
    thc_max = raw.thc;
  }

  let cbd_min = null, cbd_max = null;
  if (raw.cbd && typeof raw.cbd === 'object' && 'min' in raw.cbd) {
    cbd_min = toNumber(raw.cbd.min);
    cbd_max = toNumber(raw.cbd.max);
  } else if (raw.cbd_min != null || raw.cbd_max != null) {
    cbd_min = toNumber(raw.cbd_min);
    cbd_max = toNumber(raw.cbd_max);
  } else if (raw.cbd_percent != null) {
    cbd_min = toNumber(raw.cbd_percent);
    cbd_max = toNumber(raw.cbd_percent);
  } else if (typeof raw.cbd === 'number') {
    cbd_min = raw.cbd;
    cbd_max = raw.cbd;
  }

  let description = (raw.description || raw.overview || raw.summary || '').trim();
  if (description.length > 2000) description = description.slice(0, 2000);

  const terpenes = dedupeArray(raw.terpene_profile || raw.terpenes || raw.terpene_list || []);
  const flavors = dedupeArray(raw.flavor_profile || raw.flavors || raw.aromas || []);
  const effects = dedupeArray(raw.effect_list || raw.effects || raw.reported_effects || []);
  const imageUrl = (raw.image || raw.image_url || raw.photo || '').trim();
  const type = normalizeType(raw.strain_type || raw.type || raw.classification);

  return {
    name,
    slug: slugify(name),
    normalizedName: normalizeName(name),
    type: wrapField('type', type),
    description: wrapField('description', description),
    thc_min: wrapField('thc_min', thc_min),
    thc_max: wrapField('thc_max', thc_max),
    cbd_min: wrapField('cbd_min', cbd_min),
    cbd_max: wrapField('cbd_max', cbd_max),
    terpenes: wrapField('terpenes', terpenes),
    flavors: wrapField('flavors', flavors),
    effects: wrapField('effects', effects),
    image_url: wrapField('image_url', imageUrl),
    source: sourceName,
    sourceWeight,
  };
}

function normalizeName(name) {
  return String(name ?? '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
