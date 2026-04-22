import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

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

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const results: { table: string; column: string; cleared: number; skipped: number }[] = [];

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
      results.push({ table: t.table, column: t.column, cleared: -1, skipped: 0 });
      continue;
    }

    const rows = (data as { id: string; [k: string]: unknown }[]) || [];
    let cleared = 0;
    let skipped = 0;

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
        if (!dryRun) {
          const { error: updateError } = await adminClient
            .from(t.table)
            .update({ [t.column]: null })
            .eq("id", row.id);
          if (!updateError) cleared++;
        } else {
          cleared++;
        }
      } else {
        skipped++;
      }
    }

    results.push({ table: t.table, column: t.column, cleared, skipped });
  }

  return NextResponse.json({ mode: dryRun ? "dry-run" : "apply", results });
}
