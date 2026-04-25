import { describe, expect, it } from "vitest";
import { parseTerpenes } from "@/components/strains/terpene-radar-chart";
import { normalizeTerpeneList } from "@/lib/strain-display";

describe("terpene radar chart parsing", () => {
  it("uses string percentage values for chart scaling and labels", () => {
    const parsed = parseTerpenes([
      { name: "Limonene", percent: "0.72" },
      { Name: "Myrcene", Percent: "0,41" },
      { name: "Caryophyllene", percent: 0.18 },
    ] as Array<string | { name?: string; Name?: string; percent?: string | number; Percent?: string | number }>);

    expect(parsed).toEqual([
      { name: "Limonene", originalPercent: 0.72, value: 1 },
      { name: "Myrcene", originalPercent: 0.41, value: 0.5694444444444444 },
      { name: "Caryophyllene", originalPercent: 0.18, value: 0.25 },
    ]);
  });

  it("keeps terpene labels readable when percentages arrive as strings", () => {
    expect(
      normalizeTerpeneList([
        { name: "Limonene", percent: "0.72" },
        { name: "Myrcene", percent: "0,41" },
        { name: "Pinene" },
      ])
    ).toEqual(["Limonene (0.72%)", "Myrcene (0.41%)", "Pinene"]);
  });
});
