import { Strain } from "@/lib/types";

export type ThemeConfig = {
    color: string;
    className: string;
    underlineClass: string;
};

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
