import { NextResponse } from "next/server";
import { authenticateRequest, jsonError } from "@/lib/api-response";
import { isAppAdmin } from "@/lib/auth";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const reqClone = request.clone();
  
  // Authentifizierung
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (auth instanceof NextResponse) return auth;

  // Admin Check
  if (!isAppAdmin(auth.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { limit } = await reqClone.json();

  try {
    // Wir erstellen einen Admin-Client mit dem Service Role Key
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
    
    // Trigger-Update
    const { error } = await supabaseAdmin
      .from('strains')
      .update({ source_notes: `TRIGGER_LIMIT_${limit}_${Date.now()}` })
      .eq('slug', 'blue-zushi');

    if (error) throw error;

    return NextResponse.json({ ok: true, message: "VPS Scraper via DB getriggert!" });
  } catch (error: any) {
    return NextResponse.json({ error: "Trigger-Fehler", details: error.message }, { status: 500 });
  }
}
