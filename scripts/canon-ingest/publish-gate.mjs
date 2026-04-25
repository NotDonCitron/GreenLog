const VALID_TYPES = ['indica', 'sativa', 'hybrid'];
const MIN_TERPENES = 2;
const MIN_FLAVORS = 1;
const MIN_EFFECTS = 1;

export function validatePublishGate(strain, existingRow = null) {
  const isProtected = existingRow?.publication_status &&
    ['locked', 'published'].includes(existingRow.publication_status.toLowerCase());

  const isNew = !existingRow;

  if (isNew) {
    return validateFullGate(strain);
  }

  if (isProtected) {
    return validateEnrichmentOnly(strain, existingRow);
  }

  return validatePartialUpdate(strain, existingRow);
}

function validateFullGate(strain) {
  const reasons = [];

  if (!strain.name || !strain.name.trim()) reasons.push('Missing name');
  if (!strain.slug || !strain.slug.trim()) reasons.push('Missing slug');
  if (!strain.type || !VALID_TYPES.includes(strain.type)) reasons.push('Invalid type');
  if (!strain.description || strain.description.trim().length < 20) reasons.push('Description too short');
  if (strain.thc_min == null || strain.thc_max == null) reasons.push('Incomplete THC data');
  else if (strain.thc_max > 50) reasons.push('THC max exceeds realistic ceiling (50%)');
  if (strain.cbd_min == null || strain.cbd_max == null) reasons.push('Incomplete CBD data');
  const uniqueTerpenes = Array.isArray(strain.terpenes)
    ? new Set(strain.terpenes.map((value) => String(value).trim().toLowerCase()).filter(Boolean)).size
    : 0;
  if (uniqueTerpenes < MIN_TERPENES) reasons.push('Minimum 2 terpenes required');
  if (!Array.isArray(strain.flavors) || strain.flavors.length < MIN_FLAVORS) reasons.push('Minimum 1 flavor required');
  if (!Array.isArray(strain.effects) || strain.effects.length < MIN_EFFECTS) reasons.push('Minimum 1 effect required');
  if (!strain.image_url || !strain.image_url.startsWith('http')) reasons.push('Missing image_url');
  if (!strain.source || !String(strain.source).trim()) reasons.push('Missing source identifier');

  return {
    passed: reasons.length === 0,
    mode: 'full_insert',
    fieldsToUpdate: Object.keys(strain).filter(k => strain[k] != null && k !== 'sourceProvenance' && k !== 'conflicts' && k !== 'imageSources'),
    reasons,
  };
}

function validatePartialUpdate(strain, existingRow) {
  const fieldsToUpdate = [];
  const reasons = [];

  const checkable = [
    { field: 'type', current: existingRow.type, incoming: strain.type, required: true },
    { field: 'description', current: existingRow.description, incoming: strain.description, required: true },
    { field: 'thc_min', current: existingRow.thc_min, incoming: strain.thc_min, required: true },
    { field: 'thc_max', current: existingRow.thc_max, incoming: strain.thc_max, required: true },
    { field: 'cbd_min', current: existingRow.cbd_min, incoming: strain.cbd_min, required: true },
    { field: 'cbd_max', current: existingRow.cbd_max, incoming: strain.cbd_max, required: true },
    { field: 'terpenes', current: existingRow.terpenes, incoming: strain.terpenes, required: true },
    { field: 'flavors', current: existingRow.flavors, incoming: strain.flavors, required: true },
    { field: 'effects', current: existingRow.effects, incoming: strain.effects, required: true },
    { field: 'image_url', current: existingRow.image_url, incoming: strain.image_url, required: false },
  ];

  for (const { field, current, incoming, required } of checkable) {
    if (incoming == null) continue;
    if (current != null && current !== '' && !(Array.isArray(current) && current.length === 0)) continue;
    fieldsToUpdate.push(field);
  }

  if (fieldsToUpdate.length === 0) {
    reasons.push('No gaps to fill');
  }

  return {
    passed: fieldsToUpdate.length > 0,
    mode: 'partial_update',
    fieldsToUpdate,
    reasons,
  };
}

function validateEnrichmentOnly(strain, existingRow) {
  const fieldsToUpdate = [];

  if (strain.terpenes?.length && (!existingRow.terpenes || existingRow.terpenes.length === 0)) {
    fieldsToUpdate.push('terpenes');
  }
  if (strain.flavors?.length && (!existingRow.flavors || existingRow.flavors.length === 0)) {
    fieldsToUpdate.push('flavors');
  }
  if (strain.effects?.length && (!existingRow.effects || existingRow.effects.length === 0)) {
    fieldsToUpdate.push('effects');
  }
  if (strain.image_url && (!existingRow.image_url || existingRow.image_url.includes('placeholder') || existingRow.image_url.includes('picsum'))) {
    fieldsToUpdate.push('image_url');
  }
  if (strain.description && (!existingRow.description || existingRow.description.length < 20)) {
    fieldsToUpdate.push('description');
  }

  return {
    passed: fieldsToUpdate.length > 0,
    mode: 'enrichment_only',
    fieldsToUpdate,
    reasons: fieldsToUpdate.length === 0 ? ['Protected strain, no gaps to fill'] : [],
  };
}
