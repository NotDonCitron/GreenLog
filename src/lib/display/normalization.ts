import { StrainSource, Terpene } from "@/lib/types";
import { DisplayableValue, extractDisplayName, parsePercentValue } from "./utils";

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

            const terpene = value as Terpene & Record<string, unknown>;
            const name = typeof terpene.name === "string"
                ? terpene.name
                : typeof terpene.Name === "string"
                    ? terpene.Name
                    : null;
            if (!name?.trim()) return null;

            const percent = parsePercentValue(
                terpene.percent ??
                terpene.Percent ??
                terpene.percentageMax ??
                terpene.percentageMin ??
                terpene.percentage ??
                terpene.value
            );

            return typeof percent === "number"
                ? `${name.trim()} (${percent}%)`
                : name.trim();
        })
        .filter((value): value is string => Boolean(value));
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
