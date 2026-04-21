import crypto from 'crypto';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif',
]);
const MAX_IMAGE_BYTES = 10_000_000;

export async function processImagePipeline(consolidated, supabase, config) {
  const imageCandidates = consolidated.imageSources || [];
  if (consolidated.image_url) {
    imageCandidates.unshift({ url: consolidated.image_url, source: consolidated.sourceProvenance?.image_url?.source || 'unknown' });
  }

  for (const candidate of imageCandidates) {
    if (!candidate.url) continue;

    const downloadResult = await downloadImage(candidate.url);
    if (!downloadResult.ok) continue;

    const storagePath = buildStoragePath(consolidated.slug, candidate, downloadResult);
    const uploadResult = await uploadToStorage(supabase, storagePath, downloadResult, config);
    if (!uploadResult.ok) continue;

    return {
      ok: true,
      storagePath,
      publicUrl: uploadResult.publicUrl,
      attribution: candidate.attribution || { source: candidate.source },
      sizeBytes: downloadResult.sizeBytes,
      contentType: downloadResult.contentType,
    };
  }

  return { ok: false, reason: 'all_sources_failed' };
}

async function downloadImage(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(20000),
        headers: {
          'User-Agent': 'GreenLog-Canon-Ingest/1.0',
          Accept: 'image/*,*/*;q=0.8',
        },
      });

      if (response.status === 429 || response.status >= 500) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }

      if (!response.ok) return { ok: false, reason: `http_${response.status}` };

      const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
      if (contentType && !ALLOWED_MIME_TYPES.has(contentType) && contentType !== 'application/octet-stream') {
        return { ok: false, reason: 'invalid_content_type', contentType };
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength < 5000) return { ok: false, reason: 'too_small' };
      if (buffer.byteLength > MAX_IMAGE_BYTES) return { ok: false, reason: 'too_large' };

      return {
        ok: true,
        buffer,
        contentType: contentType || `image/${inferExtension(url)}`,
        finalUrl: response.url || url,
        sizeBytes: buffer.byteLength,
        extension: inferExtension(response.url || url, contentType),
      };
    } catch {
      continue;
    }
  }
  return { ok: false, reason: 'download_failed' };
}

async function uploadToStorage(supabase, storagePath, imageAsset, config) {
  const bucket = config?.bucket || 'strain-images';
  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, imageAsset.buffer, {
      contentType: imageAsset.contentType,
      cacheControl: '31536000',
      upsert: true,
    });

  if (error) return { ok: false, reason: error.message };

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return { ok: true, publicUrl: data?.publicUrl ?? null };
}

function buildStoragePath(slug, candidate, imageAsset) {
  const hash = crypto.createHash('sha1').update(candidate.url).digest('hex').slice(0, 12);
  const source = candidate.source || 'unknown';
  const ext = imageAsset.extension || 'jpg';
  return `canon/strains/${slug}/${source}-${hash}.${ext}`;
}

function inferExtension(url, contentType = '') {
  const typeMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif' };
  const normalizedType = contentType.split(';')[0].trim().toLowerCase();
  if (typeMap[normalizedType]) return typeMap[normalizedType];
  try {
    const ext = new URL(url).pathname.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  } catch {}
  return 'jpg';
}
