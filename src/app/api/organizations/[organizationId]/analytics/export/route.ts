import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

type RouteParams = { params: Promise<{ organizationId: string }> };

const sanitizeCsvCell = (value: string): string => {
  if (!value) return "";
  if (/^[=+\-@]/.test(value)) {
    return "'" + value;
  }
  return value.replace(/"/g, '""');
};

// GET /api/organizations/[organizationId]/analytics/export
// Returns CSV export of organization strain analytics
export async function GET(request: Request, { params }: RouteParams) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof Response) return auth;

  const { user, supabase } = auth;
  const { organizationId } = await params;

  // Check membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("membership_status", "active")
    .single();

  if (!membership) {
    return jsonError("Forbidden", 403);
  }

  // Get org name
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .single();

  // Get all active member user_ids
  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", organizationId)
    .eq("membership_status", "active");

  const memberIds = members?.map(m => m.user_id) || [];

  // Get all ratings
  const { data: ratingsData } = await supabase
    .from("ratings")
    .select(`
      rating,
      review,
      created_at,
      user:profiles!ratings_user_id_fkey(username, display_name),
      strain:strains(name, slug)
    `)
    .in("user_id", memberIds)
    .order("created_at", { ascending: false });

  // Get all favorites/wishlist
  const { data: relationsData } = await supabase
    .from("user_strain_relations")
    .select("relation_type, created_at, strain:strains(name, slug)")
    .in("user_id", memberIds)
    .order("created_at", { ascending: false });

  // Build CSV
  const lines: string[] = [];
  lines.push(`Organization Analytics Export: ${org?.name || organizationId}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total Members: ${memberIds.length}`);
  lines.push("");

  // Strains section
  lines.push("=== TOP STRAINS ===");
  lines.push("Strain,Ranking,Bewertungen,Durchschnitt,Aktionen");

  // Aggregate strain data
  const strainData: Record<string, any> = {};
  for (const r of (ratingsData || [])) {
    const slug = (r.strain as any)?.slug || "unknown";
    if (!strainData[slug]) {
      strainData[slug] = { name: (r.strain as any)?.name || slug, ratings: 0, total: 0 };
    }
    strainData[slug].ratings++;
    strainData[slug].total += r.rating as number;
  }
  for (const rel of (relationsData || [])) {
    const slug = (rel.strain as any)?.slug || "unknown";
    if (!strainData[slug]) {
      strainData[slug] = { name: (rel.strain as any)?.name || slug, ratings: 0, total: 0 };
    }
  }

  const sortedStrains = Object.values(strainData)
    .sort((a: any, b: any) => b.ratings - a.ratings);

  for (let i = 0; i < Math.min(sortedStrains.length, 50); i++) {
    const s = sortedStrains[i] as any;
    const avg = s.ratings > 0 ? (s.total / s.ratings).toFixed(1) : "-";
    lines.push(`"${sanitizeCsvCell(s.name)}",${i + 1},${s.ratings},${avg},""`);
  }

  lines.push("");
  lines.push("=== RECENTE BEWERTUNGEN ===");
  lines.push("Strain,Benutzer,Bewertung,Review,Datum");

  for (const r of (ratingsData || []).slice(0, 100)) {
    const username = (r.user as any)?.display_name || (r.user as any)?.username || "Unbekannt";
    const strainName = (r.strain as any)?.name || "Unbekannt";
    const review = (r.review as string) || "";
    const date = new Date(r.created_at).toLocaleDateString("de-DE");
    lines.push(`"${sanitizeCsvCell(strainName)}","${sanitizeCsvCell(username)}",${r.rating},"${sanitizeCsvCell(review)}",${date}`);
  }

  const csv = lines.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="analytics-${org?.name || organizationId}-${Date.now()}.csv"`,
    },
  });
}
