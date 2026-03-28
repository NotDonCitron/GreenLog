import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

let supabase = null;

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

/**
 * Uploads a local image file to Supabase Storage.
 * @param {string} localPath - Path to the local image file
 * @param {string} slug - Slug to use as filename (will be saved as ${slug}.jpg)
 * @returns {Promise<{ success: boolean, publicUrl?: string, error?: string }>}
 */
export async function uploadToStorage(localPath, slug) {
  // Validate slug to prevent path traversal
  if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
    return { success: false, error: 'Invalid slug: path traversal detected' };
  }

  const fileName = `${slug}.jpg`;
  const fileBuffer = fs.readFileSync(localPath);

  const { data, error } = await getSupabase().storage
    .from('strains')
    .upload(fileName, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    console.error(`  Storage upload error: ${error.message}`);
    return { success: false, error: error.message };
  }

  // Get public URL
  const { data: urlData } = getSupabase().storage
    .from('strains')
    .getPublicUrl(fileName);

  return { success: true, publicUrl: urlData.publicUrl };
}
