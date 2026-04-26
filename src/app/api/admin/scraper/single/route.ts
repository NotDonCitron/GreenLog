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

  const { slug } = await reqClone.json();

  if (!slug || typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error } = await supabaseAdmin
      .from('strains')
      .update({ source_notes: `SINGLE_${slug}_${Date.now()}` })
      .eq('slug', 'blue-zushi');

    if (error) throw error;

    return NextResponse.json({ ok: true, message: `Single import triggered: ${slug}` });
  } catch (error: any) {
    return NextResponse.json({ error: "Trigger-Fehler", details: error.message }, { status: 500 });
  }
}
