import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();
        if (!email || !password) {
            return NextResponse.json({ error: "E-Mail und Passwort erforderlich" }, { status: 400 });
        }
        const supabase = await createServerSupabaseClient();
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ user: data.user, session: data.session });
    } catch (err) {
        console.error("[API /auth/sign-up]", err);
        return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
    }
}
