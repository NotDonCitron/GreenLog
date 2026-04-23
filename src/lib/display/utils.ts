export type DisplayableValue = string | { name?: string | null; label?: string | null } | null | undefined;

export function extractDisplayName(value: DisplayableValue) {
    if (typeof value === "string") {
        const trimmed = value.trim();
        // Some ingestion pipelines store JSON objects as serialized strings
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            try {
                const parsed = JSON.parse(trimmed);
                if (parsed && typeof parsed.name === "string") return parsed.name.trim();
                if (parsed && typeof parsed.label === "string") return parsed.label.trim();
            } catch {
                /* fall through to plain string handling */
            }
        }
        return trimmed;
    }
    if (!value || typeof value !== "object") return null;
    if ("name" in value && typeof value.name === "string") return value.name.trim();
    if ("label" in value && typeof value.label === "string") return value.label.trim();
    return null;
}

export function safeParsePercent(value: string) {
    const trimmedValue = value.trim();
    if (!trimmedValue) return null;

    const parsedValue = Number.parseFloat(trimmedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
}
