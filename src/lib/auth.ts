// Server-side auth checks should accept admin IDs from both variables.
// This avoids client/server mismatches during env migration.
const APP_ADMIN_IDS = process.env.APP_ADMIN_IDS || "";
const PUBLIC_APP_ADMIN_IDS = process.env.NEXT_PUBLIC_APP_ADMIN_IDS || "";

export function isAppAdmin(userId: string): boolean {
    const adminIds = new Set(
        [...APP_ADMIN_IDS.split(","), ...PUBLIC_APP_ADMIN_IDS.split(",")]
            .map(id => id.trim())
            .filter(Boolean)
    );
    return adminIds.has(userId);
}
