import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-response";
import { isAppAdmin } from "@/lib/auth";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const reqClone = request.clone();

  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof NextResponse) return auth;

  if (!isAppAdmin(auth.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data } = await supabaseAdmin
      .from('strains')
      .select('source_notes')
      .eq('slug', 'blue-zushi')
      .single();

    const notes = data?.source_notes || '';

    if (!notes.startsWith('BUSY')) {
      return NextResponse.json({ error: "Scraper is not running" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('strains')
      .update({ source_notes: `STOP_${Date.now()}` })
      .eq('slug', 'blue-zushi');

    if (error) throw error;

    return NextResponse.json({ ok: true, message: "Stop signal sent to VPS" });
  } catch (error: any) {
    return NextResponse.json({ error: "Stop-Fehler", details: error.message }, { status: 500 });
  }
}
