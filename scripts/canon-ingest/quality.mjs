export function calculateFieldConfidence(field, value) {
  if (value == null) return 0;
  if (field === 'type') return value ? 1.0 : 0;
  if (field === 'thc_min' || field === 'thc_max' || field === 'cbd_min' || field === 'cbd_max') {
    return value != null ? 1.0 : 0;
  }
  if (field === 'description') {
    if (typeof value !== 'string') return 0;
    const words = value.trim().split(/\s+/).length;
    return Math.min(1.0, words / 100);
  }
  if (field === 'terpenes' || field === 'flavors' || field === 'effects') {
    if (!Array.isArray(value)) return 0;
    return Math.min(1.0, value.length / 5);
  }
  if (field === 'image_url') {
    if (typeof value !== 'string' || !value.trim()) return 0;
    return value.startsWith('http') ? 1.0 : 0;
  }
  return value ? 1.0 : 0;
}

export function calculateRecordScore(strain) {
  let score = 0;
  if (strain.name) score += 10;
  if (strain.slug) score += 5;
  if (strain.type) score += 10;
  if (strain.description) {
    const words = strain.description.trim().split(/\s+/).length;
    if (words >= 80) score += 10;
    if (words >= 200) score += 5;
    if (words >= 500) score += 5;
  }
  const hasThcRange = strain.thc_min != null && strain.thc_max != null;
  const hasThcSingle = strain.thc_min != null || strain.thc_max != null;
  if (hasThcRange) score += 10;
  else if (hasThcSingle) score += 5;
  const hasCbdRange = strain.cbd_min != null && strain.cbd_max != null;
  const hasCbdSingle = strain.cbd_min != null || strain.cbd_max != null;
  if (hasCbdRange) score += 10;
  else if (hasCbdSingle) score += 5;
  const terpCount = strain.terpenes?.length ?? 0;
  if (terpCount >= 2) score += 5;
  if (terpCount >= 4) score += 3;
  if (terpCount >= 7) score += 2;
  const flavCount = strain.flavors?.length ?? 0;
  if (flavCount >= 1) score += 3;
  if (flavCount >= 3) score += 2;
  const effectCount = strain.effects?.length ?? 0;
  if (effectCount >= 1) score += 3;
  if (effectCount >= 4) score += 2;
  if (strain.image_url) {
    const isSelfHosted = strain.image_url?.includes('supabase.co') ||
      strain.image_url?.includes('minio') ||
      strain.image_url?.includes('31.97.77.89') ||
      strain.canonical_image_path;
    score += isSelfHosted ? 15 : 5;
  }
  return Math.min(score, 100);
}
