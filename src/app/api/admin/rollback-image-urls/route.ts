import { NextResponse } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-response";
import { isAppAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedClient } from "@/lib/supabase/client";

export const runtime = "nodejs";
export const maxDuration = 300;

function cannalogUrlToMediaPath(url: string | null): string | null {
  if (!url || typeof url !== "string") return null;

  if (url.includes("storage.cannalog.fun/media/")) {
    const idx = url.indexOf("/media/");
    return url.slice(idx);
  }

  if (url.includes("storage.cannalog.fun/strains/")) {
    const idx = url.indexOf("/strains/");
    return `/media${url.slice(idx)}`;
  }

  return null;
}

interface RollbackResult {
  table: string;
  column: string;
  total: number;
  updated: number;
  failed: number;
  sample: string[];
}

async function authorizeMaintenanceRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return null;

  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof Response) return auth;

  if (!isAppAdmin(auth.user.id)) {
    return jsonError("Forbidden", 403);
  }

  return null;
}

export async function POST(request: Request) {
  const authError = await authorizeMaintenanceRequest(request);
  if (authError) return authError;

  const adminClient = getSupabaseAdmin();

  const body = await request.json().catch(() => ({}));
  const dryRun = body.dryRun === true;
  const batchSize = body.batchSize || 100;
  const results: RollbackResult[] = [];

  const targets = [
    { table: "strains" as const, column: "image_url" as const },
    { table: "profiles" as const, column: "avatar_url" as const },
    { table: "organizations" as const, column: "logo_url" as const },
    { table: "user_collection" as const, column: "user_image_url" as const },
  ];

  for (const t of targets) {
    let total = 0;
    let updated = 0;
    let failed = 0;
    const sample: string[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await adminClient
        .from(t.table)
        .select(`id, ${t.column}`)
        .not(t.column, "is", null)
        .like(t.column, "%storage.cannalog.fun%")
        .range(offset, offset + batchSize - 1);

      if (error) {
        results.push({
          table: t.table,
          column: t.column,
          total: 0,
          updated: 0,
          failed: 1,
          sample: [error.message],
        });
        hasMore = false;
        break;
      }

      const rows = (data as { id: string; [k: string]: unknown }[]) || [];
      if (rows.length === 0) {
        hasMore = false;
        break;
      }

      total += rows.length;

      for (const row of rows) {
        const oldUrl = row[t.column] as string | null;
        const newPath = cannalogUrlToMediaPath(oldUrl);

        if (!newPath) {
          failed++;
          continue;
        }

        if (sample.length < 3) {
          sample.push(`${oldUrl} → ${newPath}`);
        }

        if (!dryRun) {
          const { error: updateError } = await adminClient
            .from(t.table)
            .update({ [t.column]: newPath })
            .eq("id", row.id);

          if (updateError) {
            failed++;
          } else {
            updated++;
          }
        } else {
          updated++;
        }
      }

      offset += batchSize;
      if (rows.length < batchSize) hasMore = false;
    }

    results.push({ table: t.table, column: t.column, total, updated, failed, sample });
  }

  return NextResponse.json({ mode: dryRun ? "dry-run" : "apply", results });
}
