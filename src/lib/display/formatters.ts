import { Strain } from "@/lib/types";
import { normalizeDisplayList } from "./normalization";

const DEFAULT_TASTE_FALLBACK = "Zitrus, Erdig";
const DEFAULT_EFFECT_FALLBACK = "Euphorie";

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
