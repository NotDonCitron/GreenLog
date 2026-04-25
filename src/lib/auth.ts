const APP_ADMIN_IDS = process.env.APP_ADMIN_IDS || "";

export function isAppAdmin(userId: string): boolean {
    const adminIds = new Set(
        APP_ADMIN_IDS.split(",")
            .map(id => id.trim())
            .filter(Boolean)
    );
    return adminIds.has(userId);
}
