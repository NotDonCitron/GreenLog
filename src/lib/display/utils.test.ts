import { describe, it, expect } from "vitest";
import { extractDisplayName } from "./utils";

describe("extractDisplayName", () => {
  it("trims plain strings", () => {
    expect(extractDisplayName("  Uplifted  ")).toBe("Uplifted");
  });

  it("parses JSON-serialized objects with a name field", () => {
    expect(extractDisplayName('{"name":"Uplifted","intensity":50}')).toBe("Uplifted");
  });

  it("parses JSON-serialized objects with a label field", () => {
    expect(extractDisplayName('{"label":"Relaxed","score":3}')).toBe("Relaxed");
  });

  it("falls back to raw string when JSON is invalid", () => {
    expect(extractDisplayName("{not json")).toBe("{not json");
  });

  it("extracts name from an object", () => {
    expect(extractDisplayName({ name: "Happy" })).toBe("Happy");
  });

  it("extracts label from an object when name is missing", () => {
    expect(extractDisplayName({ label: "Energetic" })).toBe("Energetic");
  });

  it("returns null for null/undefined", () => {
    expect(extractDisplayName(null)).toBeNull();
    expect(extractDisplayName(undefined)).toBeNull();
  });
});
