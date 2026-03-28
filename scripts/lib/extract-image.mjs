import fs from 'fs';
import { execSync } from 'child_process';

/**
 * Fetches a URL using curl and extracts the og:image meta tag content.
 * @param {string} url - The URL to fetch
 * @param {string} [userAgent] - Custom User-Agent header
 * @returns {string|null} - The og:image URL or null if not found
 */
export function extractOgImage(url, userAgent) {
  const defaultUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const ua = userAgent || defaultUa;

  let html;
  try {
    html = execSync(
      `curl -s -L -A "${ua.replace(/"/g, '\\"')}" --max-time 10 "${url}"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
  } catch {
    return null;
  }

  // Match og:image meta tag - property before content or content before property
  const ogImageRegex = /<meta\s+(?:[^>]*?\s+)?(?:property|content)=["'](?:og:image|og:image(?:\s+[^>]*)?)["'][^>]*?(?:\s+(?:property|content)=["'](?:og:image)["'][^>]*?)?\s+content=["']([^"']+)["'][^>]*>/gi;
  let match = ogImageRegex.exec(html);
  if (match) {
    return match[1];
  }

  // Fallback: look for img src with strain image extensions
  const imgRegex = /<img\s+[^>]*src=["']([^"']*(?:strain|jpg|jpeg|png|webp)[^"']*)["'][^>]*>/gi;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1].toLowerCase();
    if (/\.(jpg|jpeg|png|webp)$/i.test(src) && /strain/i.test(src)) {
      return match[1];
    }
  }

  return null;
}

/**
 * Converts a strain name to a URL-friendly slug.
 * @param {string} name - The strain name
 * @returns {string} - The slugified name
 */
export function normalizeSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Verifies if a file is a valid image based on magic bytes and size.
 * @param {string} filePath - Path to the image file
 * @returns {{ valid: true } | { valid: false, reason: string }}
 */
export function verifyImage(filePath) {
  let stats;
  try {
    stats = fs.statSync(filePath);
  } catch {
    return { valid: false, reason: 'File does not exist' };
  }

  if (stats.size <= 5000) {
    return { valid: false, reason: 'File too small (must be > 5000 bytes)' };
  }

  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(12);
  fs.readSync(fd, buffer, 0, 12, 0);
  fs.closeSync(fd);

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { valid: true };
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return { valid: true };
  }

  // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF....WEBP)
  if (
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50    // P
  ) {
    return { valid: true };
  }

  return { valid: false, reason: 'Invalid image format' };
}
