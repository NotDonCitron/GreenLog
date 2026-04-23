import { NextResponse } from "next/server";

import { authenticateRequest, jsonError } from "@/lib/api-response";
import { isAppAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedClient } from "@/lib/supabase/client";

export const runtime = "nodejs";
export const maxDuration = 60;

interface CleanupResult {
  table: string;
  column: string;
  checked: number;
  cleared: number;
  skipped: number;
  failed: number;
  sample: string[];
}

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  || process.env.VERCEL_URL?.trim()
  || "";

function resolveSiteOrigin(): string {
  if (!SITE_ORIGIN) return "";
  try {
    const raw = SITE_ORIGIN.startsWith("http") ? SITE_ORIGIN : `https://${SITE_ORIGIN}`;
    return new URL(raw).origin;
  } catch {
    return "";
  }
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

  const body = await request.json().catch(() => ({}));
  const dryRun = body.dryRun === true;

  const origin = resolveSiteOrigin();
  if (!origin) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SITE_URL or VERCEL_URL" },
      { status: 500 },
    );
  }

  const adminClient = getSupabaseAdmin();
  const results: CleanupResult[] = [];

  const targets = [
    { table: "profiles", column: "avatar_url" as const, bucket: "avatars" },
    { table: "organizations", column: "logo_url" as const, bucket: "org-logos" },
  ];

  for (const t of targets) {
    const { data, error } = await adminClient
      .from(t.table)
      .select(`id, ${t.column}`)
      .not(t.column, "is", null)
      .like(t.column, `/media/${t.bucket}/%`);

    if (error) {
      results.push({
        table: t.table,
        column: t.column,
        checked: 0,
        cleared: 0,
        skipped: 0,
        failed: 1,
        sample: [error.message],
      });
      continue;
    }

    const rows = (data as { id: string; [k: string]: unknown }[]) || [];
    let cleared = 0;
    let skipped = 0;
    let failed = 0;
    const sample: string[] = [];

    for (const row of rows) {
      const url = row[t.column] as string;
      const testUrl = `${origin}${url}`;

      let shouldClear = false;

      try {
        const res = await fetch(testUrl, {
          method: "HEAD",
          signal: AbortSignal.timeout(10_000),
          redirect: "follow",
        });
        if (!res.ok) {
          const retryRes = await fetch(testUrl, {
            method: "HEAD",
            signal: AbortSignal.timeout(10_000),
            redirect: "follow",
          });
          if (!retryRes.ok) {
            shouldClear = true;
          }
        }
      } catch {
        try {
          const retryRes = await fetch(testUrl, {
            method: "HEAD",
            signal: AbortSignal.timeout(10_000),
            redirect: "follow",
          });
          if (!retryRes.ok) {
            shouldClear = true;
          }
        } catch {
          shouldClear = true;
        }
      }

      if (shouldClear) {
        if (sample.length < 5) sample.push(url);
        if (!dryRun) {
          const { error: updateError } = await adminClient
            .from(t.table)
            .update({ [t.column]: null })
            .eq("id", row.id);
          if (updateError) {
            failed++;
          } else {
            cleared++;
          }
        } else {
          cleared++;
        }
      } else {
        skipped++;
      }
    }

    results.push({ table: t.table, column: t.column, checked: rows.length, cleared, skipped, failed, sample });
  }

  return NextResponse.json({ mode: dryRun ? "dry-run" : "apply", results });
}
