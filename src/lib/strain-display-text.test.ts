import { describe, expect, it } from "vitest";
import { sanitizeDisplayText } from "./strain-display-text";

describe("sanitizeDisplayText", () => {
  it("removes escaped trailing photo credit text from producer labels", () => {
    expect(sanitizeDisplayText('LUMPY. PHOTO BY DAVID DOWNS FOR LEAFLY."')).toBe("LUMPY");
  });
});
