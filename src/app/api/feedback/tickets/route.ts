import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";

const ALLOWED_CREATOR_IDS = (
  process.env.FEEDBACK_ALLOWED_CREATOR_IDS || ""
).split(",").map(id => id.trim()).filter(Boolean);

function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const accessToken = authHeader?.replace("Bearer ", "");
  if (!accessToken) return null;
  return getAuthenticatedClient(accessToken);
}

export async function POST(req: Request) {
  try {
    const { title, description, category, priority, page_url, context } = await req.json();

    const supabase = getUserFromRequest(req);
    if (!supabase) {
      return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
    }

    if (!ALLOWED_CREATOR_IDS.includes(user.id)) {
      return NextResponse.json(
        { error: "Du hast keine Berechtigung, Tickets zu erstellen." },
        { status: 403 }
      );
    }

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: "Titel und Beschreibung sind erforderlich." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("feedback_tickets")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        category: category || "bug",
        priority: priority || "medium",
        page_url: page_url || null,
        context: context || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Feedback ticket insert error:", error);
      return NextResponse.json({ error: "Fehler beim Erstellen des Tickets." }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/feedback/tickets error:", err);
    return NextResponse.json({ error: "Server-Fehler" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const supabase = getUserFromRequest(req);
    if (!supabase) {
      return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("feedback_tickets")
      .select(`
        *,
        profiles!feedback_tickets_user_id_fkey(username),
        ticket_approvals(user_id)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Feedback tickets fetch error:", error);
      return NextResponse.json({ error: "Fehler beim Laden der Tickets." }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/feedback/tickets error:", err);
    return NextResponse.json({ error: "Server-Fehler" }, { status: 500 });
  }
}
