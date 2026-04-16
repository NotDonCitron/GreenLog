import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";
import { USER_ROLES } from "@/lib/roles";

type RouteParams = { params: Promise<{ organizationId: string }> };

// GET /api/csc/export?organization_id=xxx&year=2025
// Generates § 26 KCanG compliance CSV for authorities
export async function GET(request: Request, { params }: RouteParams) {
    const { organizationId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("organization_id") || organizationId;
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString(), 10);

    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (auth instanceof Response) return auth;
    const { user, supabase } = auth;

    const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", user.id)
        .eq("membership_status", "active")
        .single();

    if (!membership) return jsonError("Forbidden", 403);

    const canManage = [USER_ROLES.GRUENDER, USER_ROLES.ADMIN].includes(membership.role as any);
    if (!canManage) return jsonError("Forbidden", 403);

    // Get org details
    const { data: org } = await supabase
        .from("organizations")
        .select("name, license_number")
        .eq("id", orgId)
        .single();

    // Date range for the year
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    // Fetch all batches for the year
    const { data: batches } = await supabase
        .from("csc_batches")
        .select(`
            id,
            harvest_date,
            total_weight_grams,
            plant_count,
            strain_id,
            strains:strain_id (name, avg_thc, avg_cbd)
        `)
        .eq("organization_id", orgId)
        .gte("harvest_date", yearStart)
        .lte("harvest_date", yearEnd);

    // Fetch all dispensations for the year
    const { data: dispensations } = await supabase
        .from("csc_dispensations")
        .select(`
            id,
            dispensed_at,
            amount_grams,
            member_id,
            batch_id
        `)
        .eq("organization_id", orgId)
        .gte("dispensed_at", yearStart)
        .lte("dispensed_at", yearEnd + "T23:59:59");

    // Fetch all destructions for the year
    const { data: destructions } = await supabase
        .from("csc_destructions")
        .select(`
            id,
            destroyed_at,
            amount_grams,
            batch_id,
            destruction_reason
        `)
        .eq("organization_id", orgId)
        .gte("destroyed_at", yearStart)
        .lte("destroyed_at", yearEnd + "T23:59:59");

    // Build batch lookup map
    const batchMap: Record<string, { date: string; strain: string; thc: number | null; cbd: number | null; totalWeight: number }> = {};
    for (const b of batches || []) {
        batchMap[b.id] = {
            date: b.harvest_date,
            strain: (b.strains as any)?.name || "Unbekannt",
            thc: (b.strains as any)?.avg_thc ?? null,
            cbd: (b.strains as any)?.avg_cbd ?? null,
            totalWeight: Number(b.total_weight_grams),
        };
    }

    // Aggregate by month
    const monthlyData: Record<string, {
        month: string;
        totalHarvest: number;
        totalDispensed: number;
        totalDestroyed: number;
        strainBreakdown: { strain: string; thc: number | null; cbd: number | null; harvest: number; dispensed: number; destroyed: number }[];
    }> = {};

    for (const d of dispensations || []) {
        const month = d.dispensed_at.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) monthlyData[month] = {
            month,
            totalHarvest: 0,
            totalDispensed: 0,
            totalDestroyed: 0,
            strainBreakdown: [],
        };
        monthlyData[month].totalDispensed += Number(d.amount_grams);
    }

    for (const b of batches || []) {
        const month = (b.harvest_date as string).substring(0, 7);
        if (!monthlyData[month]) monthlyData[month] = {
            month,
            totalHarvest: 0,
            totalDispensed: 0,
            totalDestroyed: 0,
            strainBreakdown: [],
        };
        monthlyData[month].totalHarvest += Number(b.total_weight_grams);
    }

    for (const d of destructions || []) {
        const month = (d.destroyed_at as string).substring(0, 7);
        if (!monthlyData[month]) monthlyData[month] = {
            month,
            totalHarvest: 0,
            totalDispensed: 0,
            totalDestroyed: 0,
            strainBreakdown: [],
        };
        monthlyData[month].totalDestroyed += Number(d.amount_grams);
    }

    // Build CSV
    const sanitize = (val: string | number | null | undefined): string => {
        const s = val == null ? "" : String(val);
        if (/^[=+\-@]/.test(s)) return "'" + s;
        return s.replace(/"/g, '""');
    };

    const lines: string[] = [];
    lines.push(`"KCanG § 26 Bericht — ${org?.name || orgId} — ${year}"`);
    lines.push(`"Erstellt: ${new Date().toISOString()}"`);
    lines.push(`"Lizenznummer: ${org?.license_number || "N/A"}"`);
    lines.push("");

    // Monthly summary
    lines.push(`"Monatsübersicht ${year}"`);
    lines.push(`"Monat,Erntemenge(g),Abgabemenge(g),Vernichtungsmenge(g)"`);
    const sortedMonths = Object.keys(monthlyData).sort();
    for (const m of sortedMonths) {
        const d = monthlyData[m];
        lines.push(`"${m}",${d.totalHarvest.toFixed(2)},${d.totalDispensed.toFixed(2)},${d.totalDestroyed.toFixed(2)}`);
    }

    lines.push("");
    lines.push(`"Detaillierte Abgaben ${year}"`);
    lines.push(`"Datum,Zeit,Sorte,THC(%),CBD(%),Mitglieds-ID,Abgabemenge(g)"`);
    for (const d of dispensations || []) {
        const b = batchMap[d.batch_id];
        if (!b) continue;
        const dateStr = d.dispensed_at.substring(0, 10);
        const timeStr = d.dispensed_at.substring(11, 19);
        lines.push(`"${dateStr}","${timeStr}","${sanitize(b.strain)}",${b.thc ?? ""},${b.cbd ?? ""},"${sanitize(d.member_id)}",${Number(d.amount_grams).toFixed(2)}`);
    }

    lines.push("");
    lines.push(`"Ernten ${year}"`);
    lines.push(`"Datum,Sorte,THC(%),CBD(%),Erntemenge(g),Pflanzenanzahl"`);
    for (const b of batches || []) {
        const strain = (b.strains as any)?.name || "Unbekannt";
        lines.push(`"${b.harvest_date}","${sanitize(strain)}",${(b.strains as any)?.avg_thc ?? ""},${(b.strains as any)?.avg_cbd ?? ""},${Number(b.total_weight_grams).toFixed(2)},${b.plant_count}`);
    }

    lines.push("");
    lines.push(`"Vernichtungen ${year}"`);
    lines.push(`"Datum,Sorte,Grund,Menge(g)"`);
    for (const d of destructions || []) {
        const b = batchMap[d.batch_id];
        const strain = b?.strain || "Unbekannt";
        const dateStr = (d.destroyed_at as string).substring(0, 10);
        lines.push(`"${dateStr}","${sanitize(strain)}","${sanitize(d.destruction_reason)}",${Number(d.amount_grams).toFixed(2)}`);
    }

    const csv = lines.join("\n");

    const filename = `kcang-report-${org?.name?.replace(/[^a-zA-Z0-9]/g, "-") || orgId}-${year}.csv`;

    return new Response(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}