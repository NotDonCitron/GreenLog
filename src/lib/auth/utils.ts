// Helper to decode JWT and get user ID without API call
export function decodeToken(token: string): string | null {
    try {
        const payload = token.split(".")[1];
        const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
        return decoded.sub || null;
    } catch {
        return null;
    }
}
