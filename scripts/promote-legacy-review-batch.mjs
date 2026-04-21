/**
 * promote-legacy-review-batch.mjs
 *
 * For legacy (non-kushy) draft strains that are complete except image-hosting:
 * - fetch existing image_url
 * - upload into Supabase Storage bucket "strains-images"
 * - set canonical_image_path + image_url to self-hosted URL
 * - move publication_status from draft -> review
 *
 * Usage:
 *   node scripts/promote-legacy-review-batch.mjs --dry --limit=200
 *   node scripts/promote-legacy-review-batch.mjs --limit=200
 */

import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(PROJECT_ROOT, ".env") });
dotenv.config({ path: path.join(PROJECT_ROOT, ".env.local"), override: false });

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry");
const LIMIT = parseIntArg("--limit", 200);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = "strains-images";

function parseIntArg(name, fallback) {
  const eqArg = args.find((a) => a.startsWith(`${name}=`));
  if (eqArg) {
    const n = Number(eqArg.split("=").slice(1).join("="));
    return Number.isFinite(n) ? n : fallback;
  }
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith("--")) {
    const n = Number(args[idx + 1]);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function hasText(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function len(a) {
  return Array.isArray(a) ? a.length : 0;
}

function pickExt(imageUrl, contentType) {
  const byType = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  if (contentType && byType[contentType.toLowerCase()]) return byType[contentType.toLowerCase()];
  const m = String(imageUrl || "").match(/\.(jpg|jpeg|png|webp|gif)(?:\?|$)/i);
  if (m) return m[1].toLowerCase() === "jpeg" ? "jpg" : m[1].toLowerCase();
  return "jpg";
}

function nonImageGateOk(r) {
  return (
    hasText(r.description) &&
    (r.avg_thc != null || r.thc_min != null || r.thc_max != null) &&
    (r.avg_cbd != null || r.cbd_min != null || r.cbd_max != null) &&
    len(r.terpenes) >= 2 &&
    len(r.flavors) >= 1 &&
    len(r.effects) >= 1 &&
    hasText(r.primary_source) &&
    hasText(r.image_url)
  );
}

async function main() {
  console.log(`Legacy review batch start | dry=${DRY_RUN} | limit=${LIMIT}`);

  const rows = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from("strains")
      .select(
        "id,name,slug,source,publication_status,quality_score,description,thc_min,thc_max,avg_thc,cbd_min,cbd_max,avg_cbd,terpenes,flavors,effects,image_url,canonical_image_path,primary_source"
      )
      .neq("source", "kushy-csv")
      .eq("publication_status", "draft")
      .range(page * 1000, page * 1000 + 999)
      .order("quality_score", { ascending: false });
    if (error) {
      console.error("fetch error:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }

  const candidates = rows.filter((r) => nonImageGateOk(r) && !hasText(r.canonical_image_path)).slice(0, LIMIT);
  console.log(`draft legacy rows: ${rows.length}`);
  console.log(`eligible candidates: ${candidates.length}`);

  let uploaded = 0;
  let promoted = 0;
  let failed = 0;

  for (const r of candidates) {
    try {
      const res = await fetch(r.image_url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) {
        failed++;
        continue;
      }
      const contentType = res.headers.get("content-type") || "";
      const ext = pickExt(r.image_url, contentType);
      const storagePath = `strains-images/${r.id}.${ext}`;

      if (!DRY_RUN) {
        const bytes = Buffer.from(await res.arrayBuffer());
        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, bytes, { upsert: true, contentType: contentType || "image/jpeg" });
        if (uploadErr) {
          failed++;
          continue;
        }

        const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
        const { error: updateErr } = await supabase
          .from("strains")
          .update({
            image_url: publicUrlData.publicUrl,
            canonical_image_path: storagePath,
            publication_status: "review",
          })
          .eq("id", r.id)
          .eq("publication_status", "draft");
        if (updateErr) {
          failed++;
          continue;
        }
      }

      uploaded++;
      promoted++;
    } catch {
      failed++;
    }
  }

  console.log("-----");
  console.log(`processed: ${candidates.length}`);
  console.log(`uploaded: ${uploaded}`);
  console.log(`promoted_to_review: ${promoted}`);
  console.log(`failed: ${failed}`);
  console.log(`mode: ${DRY_RUN ? "dry" : "write"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

