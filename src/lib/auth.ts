// Server-only: APP_ADMIN_IDS must NOT have NEXT_PUBLIC_ prefix
// to prevent leaking admin UUIDs into the client bundle.
// Falls back to NEXT_PUBLIC_ for backwards compatibility during migration.
const APP_ADMIN_IDS = process.env.APP_ADMIN_IDS || process.env.NEXT_PUBLIC_APP_ADMIN_IDS || "";

export function isAppAdmin(userId: string): boolean {
    if (!APP_ADMIN_IDS) return false;
    const adminIds = APP_ADMIN_IDS.split(",").map(id => id.trim()).filter(Boolean);
    return adminIds.includes(userId);
}
