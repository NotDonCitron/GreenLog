"use client";

import { useEffect, useState } from "react";
import { parsePercentValue } from "@/lib/display/utils";

interface Terpene {
    name?: string;
    Name?: string;
    percent?: number | string;
    Percent?: number | string;
    percentageMax?: number | string;
    percentageMin?: number | string;
    percentage?: number | string;
    value?: number | string;
}

interface TerpeneRadarChartProps {
    terpenes: (string | Terpene)[];
    themeColor?: string;
    size?: number;
}

interface ParsedTerpene {
    name: string;
    value: number; // 0–1 normalized
    originalPercent?: number; // actual percent from DB, if available
}

function formatPercentLabel(percent: number): string {
    return Number.isInteger(percent) ? String(percent) : percent.toFixed(2).replace(/\.?0+$/, "");
}

function getTerpenePercent(obj: Record<string, unknown>): number | undefined {
    return parsePercentValue(
        obj.percent ??
        obj.Percent ??
        obj.percentageMax ??
        obj.percentageMin ??
        obj.percentage ??
        obj.value
    );
}

export function parseTerpenes(raw: (string | Terpene)[]): ParsedTerpene[] {
    const parsed = raw
        .map((t) => {
            if (typeof t === "string") return { name: t.trim(), percent: undefined };
            if (t && typeof t === "object") {
                // Support current and legacy terpene shapes from import pipelines.
                const obj = t as unknown as Record<string, unknown>;
                const name = obj.name || obj.Name;
                const percent = getTerpenePercent(obj);
                if (name) return { name: String(name).trim(), percent };
                return null;
            }
            return null;
        })
        .filter((t): t is { name: string; percent: number | undefined } =>
            Boolean(t && t.name)
        )
        .slice(0, 6);

    const hasAnyPercent = parsed.some(
        (t) => typeof t.percent === "number" && t.percent > 0
    );

    if (!hasAnyPercent) {
        return parsed.map((t, index) => ({
            name: t.name,
            value: Math.max(0.35, 1 - index * 0.18),
        }));
    }

    const maxPercent = Math.max(
        ...parsed.map((t) => (typeof t.percent === "number" ? t.percent : 0))
    );

    return parsed.map((t) => ({
        name: t.name,
        originalPercent: typeof t.percent === "number" ? t.percent : undefined,
        value:
            typeof t.percent === "number" && maxPercent > 0
                ? Math.max(0.15, t.percent / maxPercent) // min 15% so axis is visible
                : 0.3, // terpene without percent in a mixed set
    }));
}

function getPolygonPoints(
    values: number[],
    cx: number,
    cy: number,
    radius: number
): string {
    return values
        .map((v, i) => {
            const angle = (i * 2 * Math.PI) / values.length - Math.PI / 2;
            const x = cx + radius * v * Math.cos(angle);
            const y = cy + radius * v * Math.sin(angle);
            return `${x},${y}`;
        })
        .join(" ");
}

function getGridPolygonPoints(
    n: number,
    cx: number,
    cy: number,
    radius: number
): string {
    return Array.from({ length: n })
        .map((_, i) => {
            const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
            return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
        })
        .join(" ");
}

export function TerpeneRadarChart({
    terpenes,
    themeColor = "#00F5FF",
    size = 200,
}: TerpeneRadarChartProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Trigger mount animation
        const raf = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const parsed = parseTerpenes(terpenes);
    if (parsed.length < 3) return null;

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.34;
    const labelRadius = size * 0.46;
    const n = parsed.length;

    const gridLevels = [0.33, 0.66, 1.0];

    return (
        <div className="flex justify-center">
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="overflow-visible"
            >
                <defs>
                    <filter id="terpene-glow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Grid lines */}
                {gridLevels.map((level) => (
                    <polygon
                        key={level}
                        points={getGridPolygonPoints(n, cx, cy, radius * level)}
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth="0.5"
                        opacity={0.4}
                    />
                ))}

                {/* Axis lines */}
                {parsed.map((_, i) => {
                    const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
                    const x2 = cx + radius * Math.cos(angle);
                    const y2 = cy + radius * Math.sin(angle);
                    return (
                        <line
                            key={i}
                            x1={cx}
                            y1={cy}
                            x2={x2}
                            y2={y2}
                            stroke="var(--border)"
                            strokeWidth="0.5"
                            opacity={0.3}
                        />
                    );
                })}

                {/* Data polygon */}
                <polygon
                    points={getPolygonPoints(
                        mounted ? parsed.map((t) => t.value) : parsed.map(() => 0),
                        cx,
                        cy,
                        radius
                    )}
                    fill={`${themeColor}30`}
                    stroke={themeColor}
                    strokeWidth="1.5"
                    filter="url(#terpene-glow)"
                    style={{
                        transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                />

                {/* Data points */}
                {parsed.map((t, i) => {
                    const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
                    const v = mounted ? t.value : 0;
                    const x = cx + radius * v * Math.cos(angle);
                    const y = cy + radius * v * Math.sin(angle);
                    return (
                        <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r={2.5}
                            fill={themeColor}
                            style={{
                                transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                                transitionDelay: `${i * 50}ms`,
                            }}
                        />
                    );
                })}

                {/* Labels */}
                {parsed.map((t, i) => {
                    const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
                    const lx = cx + labelRadius * Math.cos(angle);
                    const ly = cy + labelRadius * Math.sin(angle);

                    // Determine text-anchor based on position
                    const normalizedAngle = ((angle + Math.PI * 2.5) % (Math.PI * 2));
                    let textAnchor: "start" | "middle" | "end" = "middle";
                    if (normalizedAngle > 0.3 && normalizedAngle < Math.PI - 0.3) {
                        textAnchor = "start";
                    } else if (
                        normalizedAngle > Math.PI + 0.3 &&
                        normalizedAngle < Math.PI * 2 - 0.3
                    ) {
                        textAnchor = "end";
                    }

                    const labelText = typeof t.originalPercent === "number"
                        ? `${t.name} ${formatPercentLabel(t.originalPercent)}%`
                        : t.name;

                    return (
                        <text
                            key={i}
                            x={lx}
                            y={ly}
                            textAnchor={textAnchor}
                            dominantBaseline="middle"
                            className="fill-[var(--muted-foreground)]"
                            style={{
                                fontSize: "7px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                            }}
                        >
                            {labelText}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
}
