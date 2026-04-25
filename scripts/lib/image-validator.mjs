// scripts/lib/image-validator.mjs
import sharp from 'sharp';
import { createHash } from 'crypto';

export const MIN_FILE_SIZE = 20000;      // 20 KB
export const MIN_DIMENSION = 400;        // 400×400 px
export const TARGET_FORMAT = 'jpeg';

/**
 * Validate and optionally reformat an image buffer.
 * Returns { ok: true, buffer, hash, width, height } or { ok: false, reason }.
 */
export async function validateImage(inputBuffer) {
  if (!Buffer.isBuffer(inputBuffer) || inputBuffer.length < MIN_FILE_SIZE) {
    return { ok: false, reason: `Too small: ${inputBuffer?.length || 0} bytes` };
  }

  try {
    const metadata = await sharp(inputBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      return { ok: false, reason: 'Cannot read image dimensions' };
    }
    if (metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION) {
      return { ok: false, reason: `Too small: ${metadata.width}×${metadata.height}` };
    }

    // Convert to JPEG for consistency
    const jpegBuffer = await sharp(inputBuffer)
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    const hash = createHash('md5').update(jpegBuffer).digest('hex');

    return {
      ok: true,
      buffer: jpegBuffer,
      hash,
      width: metadata.width,
      height: metadata.height,
    };
  } catch (err) {
    return { ok: false, reason: `sharp error: ${err.message}` };
  }
}
