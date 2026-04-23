import { describe, expect, it } from "vitest";
import {
  buildDefaultSourceNotes,
  detectSourceWarnings,
  getStrainSourcePolicy,
  normalizePrimarySource,
} from "./source-policy";

describe("strain source policy", () => {
  it("normalizes legacy source aliases", () => {
    expect(normalizePrimarySource("leafly-curation")).toBe("leafly");
    expect(normalizePrimarySource("manual-user")).toBe("manual-curation");
  });

  it("returns fallback policy for allbud", () => {
    const policy = getStrainSourcePolicy("allbud");
    expect(policy.tier).toBe("fallback");
    expect(policy.label).toBe("AllBud");
  });

  it("generates default notes for primary and fallback sources", () => {
    expect(buildDefaultSourceNotes("leafly")).toContain("Leafly priorisieren");
    expect(buildDefaultSourceNotes("allbud")).toContain("Fallback");
  });

  it("flags weak review-only sources without notes", () => {
    expect(
      detectSourceWarnings({
        primarySource: "askgrowers",
        imageUrl: "https://example.com/image.jpg",
        sourceNotes: "",
      })
    ).toContain("Quelle braucht dokumentierte manuelle Prüfung.");
  });

  it("flags stock-style wording in notes", () => {
    expect(
      detectSourceWarnings({
        primarySource: "askgrowers",
        imageUrl: "https://example.com/image.jpg",
        sourceNotes: "Stock photo similar to the strain",
      })
    ).toContain("Quelle oder Notizen deuten auf Stock-/Placeholder-Bild hin.");
  });
});
