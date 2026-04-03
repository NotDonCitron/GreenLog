import { jsonSuccess, jsonError } from "@/lib/api-response";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('profiles').select('id').limit(1);

    if (error) {
        return jsonError('Database connection failed: ' + error.message, 503);
    }

    return jsonSuccess({
        status: 'ok',
        database: 'connected',
        timestamp: Date.now(),
        timestampIso: new Date().toISOString(),
    });
}
