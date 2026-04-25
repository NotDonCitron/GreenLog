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

  it("uses StrainDB percentage fields instead of falling back to equal chart values", () => {
    const parsed = parseTerpenes([
      { name: "Caryophyllene", percentageMax: 1.2 },
      { name: "Myrcene", percentageMin: "0,45" },
      { name: "Limonene", percentage: "0.3%" },
    ] as Array<string | { name: string; percentageMax?: number; percentageMin?: string; percentage?: string }>);

    expect(parsed).toEqual([
      { name: "Caryophyllene", originalPercent: 1.2, value: 1 },
      { name: "Myrcene", originalPercent: 0.45, value: 0.375 },
      { name: "Limonene", originalPercent: 0.3, value: 0.25 },
    ]);
  });

  it("uses terpene order as a non-equal fallback when no percentages exist", () => {
    expect(parseTerpenes(["Caryophyllene", "Humulene", "Linalool"])).toEqual([
      { name: "Caryophyllene", value: 1 },
      { name: "Humulene", value: 0.8200000000000001 },
      { name: "Linalool", value: 0.64 },
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

  it("keeps terpene labels readable when percentages use source-specific keys", () => {
    expect(
      normalizeTerpeneList([
        { name: "Caryophyllene", percentageMax: "1.2" },
        { name: "Myrcene", percentageMin: "0,45" },
        { Name: "Limonene", percentage: "0.3%" },
      ])
    ).toEqual(["Caryophyllene (1.2%)", "Myrcene (0.45%)", "Limonene (0.3%)"]);
  });
});
