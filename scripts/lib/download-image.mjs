import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { verifyImage } from './extract-image.mjs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Downloads an image from a URL to a destination path.
 * @param {string} url - Image URL
 * @param {string} destPath - Destination file path
 * @param {number} timeoutMs - Timeout in milliseconds (default 15000)
 * @returns {{ success: true } | { success: false, reason: string }}
 */
export function downloadImage(url, destPath, timeoutMs = 15000) {
  const tmpPath = destPath + '.tmp';

  try {
    // Download to .tmp file via curl
    execSync(
      `curl -s -L -A "${UA}" -o "${tmpPath}" "${url}"`,
      { timeout: timeoutMs + 5000, maxBuffer: 10 * 1024 * 1024 }
    );
  } catch (err) {
    return { success: false, reason: `curl failed: ${err.message}` };
  }

  // Verify the downloaded file
  const verifyResult = verifyImage(tmpPath);
  if (!verifyResult.valid) {
    try { fs.unlinkSync(tmpPath); } catch {}
    return { success: false, reason: verifyResult.reason };
  }

  // Atomic rename from .tmp to dest
  try {
    fs.renameSync(tmpPath, destPath);
  } catch (err) {
    try { fs.unlinkSync(tmpPath); } catch {}
    return { success: false, reason: `rename failed: ${err.message}` };
  }

  return { success: true };
}

/**
 * Ensures a file is a JPEG by converting it with ImageMagick (quality 85).
 * Falls back to simple copy if convert is not available.
 * @param {string} srcPath - Source file path
 * @param {string} destPath - Destination file path
 * @returns {boolean} - Always returns true
 */
export function ensureJpeg(srcPath, destPath) {
  try {
    execSync(
      `convert -quality 85 "${srcPath}" "${destPath}"`,
      { timeout: 30000, stdio: 'ignore' }
    );
  } catch {
    // Fallback: simple copy if convert is not available
    try {
      fs.copyFileSync(srcPath, destPath);
    } catch {}
  }
  return true;
}
