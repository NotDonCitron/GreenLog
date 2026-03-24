import { Strain, StrainSource, Terpene } from "@/lib/types";

type DisplayableValue = string | { name?: string | null; label?: string | null } | null | undefined;

type ThemeConfig = {
    color: string;
    className: string;
    underlineClass: string;
};

const DEFAULT_TASTE_FALLBACK = "Zitrus, Erdig";
const DEFAULT_EFFECT_FALLBACK = "Euphorie";

export function extractDisplayName(value: DisplayableValue) {
    if (typeof value === "string") return value.trim();
    if (!value || typeof value !== "object") return null;
    if ("name" in value && typeof value.name === "string") return value.name.trim();
    if ("label" in value && typeof value.label === "string") return value.label.trim();
    return null;
}

export function normalizeDisplayList(values: unknown): string[] {
    if (!Array.isArray(values)) return [];

    return values
        .map((value) => extractDisplayName(value as DisplayableValue))
        .filter((value): value is string => Boolean(value));
}

export function normalizeTerpeneList(values: unknown): string[] {
    if (!Array.isArray(values)) return [];

    return values
        .map((value) => {
            if (typeof value === "string") return value.trim();
            if (!value || typeof value !== "object") return null;

            const terpene = value as Terpene;
            if (!terpene.name?.trim()) return null;

            return typeof terpene.percent === "number"
                ? `${terpene.name.trim()} (${terpene.percent}%)`
                : terpene.name.trim();
        })
        .filter((value): value is string => Boolean(value));
}

export function formatPercent(value: number | null | undefined, fallback: string) {
    return typeof value === "number" && Number.isFinite(value) ? `${value}%` : fallback;
}

export function getTasteDisplay(strain: Strain, fallback = DEFAULT_TASTE_FALLBACK) {
    const normalizedFlavors = normalizeDisplayList(strain.flavors);
    if (normalizedFlavors.length > 0) {
        return normalizedFlavors.slice(0, 2).join(", ");
    }

    const normalizedTerpenes = normalizeDisplayList(strain.terpenes);
    if (normalizedTerpenes.length > 0) {
        return normalizedTerpenes.slice(0, 2).join(", ");
    }

    return fallback;
}

export function getEffectDisplay(strain: Strain, fallback = DEFAULT_EFFECT_FALLBACK) {
    const normalizedEffects = normalizeDisplayList(strain.effects);
    if (normalizedEffects.length > 0) {
        return normalizedEffects[0];
    }

    return strain.is_medical ? "Medical" : fallback;
}

export function getStrainTheme(type: Strain["type"] | string | null | undefined): ThemeConfig {
    const normalizedType = typeof type === "string" ? type.toLowerCase() : "";

    if (normalizedType.includes("sativa")) {
        return {
            color: "#fbbf24",
            className: "theme-gold",
            underlineClass: "bg-[#fbbf24]",
        };
    }

    if (normalizedType.includes("indica")) {
        return {
            color: "#10b981",
            className: "theme-emerald",
            underlineClass: "bg-[#10b981]",
        };
    }

    return {
        color: "#00FFFF",
        className: "theme-cyan",
        underlineClass: "bg-[#00FFFF]",
    };
}

export function normalizeCollectionSource(source: string | null | undefined): StrainSource | "other" {
    switch ((source || "").toLowerCase()) {
        case "pharmacy":
        case "apotheke":
            return "pharmacy";
        case "grow":
            return "grow";
        case "csc":
            return "csc";
        case "street":
            return "street";
        case "other":
            return "other";
        default:
            return "other";
    }
}

export function safeParsePercent(value: string) {
    const trimmedValue = value.trim();
    if (!trimmedValue) return null;

    const parsedValue = Number.parseFloat(trimmedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
}
