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
            color: "#adff00",
            className: "theme-sativa",
            underlineClass: "bg-[#adff00]",
        };
    }

    if (normalizedType.includes("indica")) {
        return {
            color: "#cb00ff",
            className: "theme-indica",
            underlineClass: "bg-[#cb00ff]",
        };
    }

    return {
        color: "#00a3ff",
        className: "theme-hybrid",
        underlineClass: "bg-[#00a3ff]",
    };
}
