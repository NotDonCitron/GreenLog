import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";

const VALID_STATUSES = ["open", "ready_for_ai", "in_progress", "resolved", "closed"];

function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const accessToken = authHeader?.replace("Bearer ", "");
  if (!accessToken) return null;
  return getAuthenticatedClient(accessToken);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getUserFromRequest(req);

    if (!supabase) {
      return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Ungültiger Status. Erlaubt: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const { data: ticket, error: fetchError } = await supabase
      .from("feedback_tickets")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || !ticket) {
      return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 });
    }

    const isCreator = ticket.user_id === user.id;
    const isPascal = user.id === "236a110e-0dbe-4500-97db-edf100158e4f";

    if (!isCreator && !isPascal) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("feedback_tickets")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Ticket update error:", error);
      return NextResponse.json({ error: "Fehler beim Update" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/feedback/tickets/[id] error:", err);
    return NextResponse.json({ error: "Server-Fehler" }, { status: 500 });
  }
}
