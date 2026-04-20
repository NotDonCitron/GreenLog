import { describe, expect, it } from "vitest";
import {
  ALWAYS_PRIVATE_FIELDS,
  OPTIONAL_PUBLIC_FIELDS,
  PUBLIC_BY_DEFAULT_FIELDS,
  isAlwaysPrivateField,
} from "./privacy-matrix";

describe("privacy matrix", () => {
  it("keeps sensitive cannabis, supply, medical, and club data always private", () => {
    expect(ALWAYS_PRIVATE_FIELDS.map((field) => field.key)).toEqual(
      expect.arrayContaining([
        "dose",
        "batch",
        "stock",
        "pharmacy",
        "dispensations",
        "exact_quantities",
        "private_notes",
        "medical_context",
        "private_grow_photos",
        "organization_inventory",
        "audit_details",
      ])
    );
  });

  it("does not classify always-private fields as public or optional public", () => {
    const publicKeys = new Set([
      ...PUBLIC_BY_DEFAULT_FIELDS.map((field) => field.key),
      ...OPTIONAL_PUBLIC_FIELDS.map((field) => field.key),
    ]);

    for (const privateField of ALWAYS_PRIVATE_FIELDS) {
      expect(publicKeys.has(privateField.key)).toBe(false);
    }
  });

  it("recognizes private fields by key", () => {
    expect(isAlwaysPrivateField("dose")).toBe(true);
    expect(isAlwaysPrivateField("pharmacy")).toBe(true);
    expect(isAlwaysPrivateField("badges")).toBe(false);
  });
});
