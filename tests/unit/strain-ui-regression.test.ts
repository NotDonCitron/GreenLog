import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("strain UI regression guards", () => {
  it("removes Leafly quick import from create strain modal", () => {
    const filePath = path.resolve(process.cwd(), "src/components/strains/create-strain-modal.tsx");
    const source = fs.readFileSync(filePath, "utf8");

    expect(source).not.toContain("Leafly Quick Import");
  });

  it("uses quick-log modal in strain detail instead of legacy collect-and-rate stars", () => {
    const filePath = path.resolve(process.cwd(), "src/app/strains/[slug]/StrainDetailPageClient.tsx");
    const source = fs.readFileSync(filePath, "utf8");

    expect(source).toContain("QuickLogModal");
    expect(source).not.toContain("Collect & Rate");
    expect(source).not.toContain("Tasting Log");
  });
});
