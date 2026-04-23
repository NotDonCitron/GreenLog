import { describe, expect, it } from "vitest";
import { sanitizeDisplayText } from "./strain-display-text";

describe("sanitizeDisplayText", () => {
  it("removes trailing photo credit text from producer labels", () => {
    expect(sanitizeDisplayText("Lumpy. Photo by David Downs for Leafly.")).toBe("Lumpy");
  });

  it("strips escaped quotes at the end", () => {
    expect(sanitizeDisplayText('LUMPY. PHOTO BY DAVID DOWNS FOR LEAFLY."')).toBe("LUMPY");
  });

  it("preserves dots inside abbreviations (Dr. Krippling)", () => {
    expect(sanitizeDisplayText("Dr. Krippling")).toBe("Dr. Krippling");
  });

  it("strips trailing dot from simple names", () => {
    expect(sanitizeDisplayText("Lumpy.")).toBe("Lumpy");
  });

  it("returns empty string for null/undefined", () => {
    expect(sanitizeDisplayText(null)).toBe("");
    expect(sanitizeDisplayText(undefined)).toBe("");
  });
});
