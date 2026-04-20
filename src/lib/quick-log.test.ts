import { describe, expect, it } from "vitest";
import {
  PRIVATE_QUICK_LOG_SIDE_EFFECTS,
  PUBLIC_QUICK_LOG_EFFECTS,
  QUICK_LOG_STATUSES,
  isQuickLogEffect,
  sanitizePublicQuickLogPayload,
} from "./quick-log";

describe("quick-log domain rules", () => {
  it("keeps the public effect set stable", () => {
    expect(PUBLIC_QUICK_LOG_EFFECTS.map((effect) => effect.value)).toEqual([
      "ruhe",
      "fokus",
      "schlaf",
      "kreativitaet",
      "appetit",
    ]);
  });

  it("sanitizes the public quick log payload", () => {
    const payload = sanitizePublicQuickLogPayload({
      rating: 4.26,
      strainSlug: "animal-mints",
      effectChips: ["ruhe", "schlaf", "trocken"],
      publicReviewText: "  Abends angenehm ruhig.  ",
      sideEffects: ["trocken", "kopflastig"],
      privateStatus: "nicht_nochmal",
      privateNote: "0,4g war zu schwer.",
      dose: "0.4g",
      batch: "ABC-123",
      pharmacy: "Private Apotheke",
      setting: "Sofa nach Arbeit",
    });

    expect(payload).toEqual({
      rating: 4.3,
      strain_slug: "animal-mints",
      effect_chips: ["ruhe", "schlaf"],
      public_review_text: "Abends angenehm ruhig.",
    });
    expect(JSON.stringify(payload)).not.toContain("trocken");
    expect(JSON.stringify(payload)).not.toContain("nicht_nochmal");
    expect(JSON.stringify(payload)).not.toContain("0,4g");
    expect(JSON.stringify(payload)).not.toContain("ABC-123");
    expect(JSON.stringify(payload)).not.toContain("Apotheke");
  });

  it("recognizes public and private quick log values", () => {
    expect(isQuickLogEffect("ruhe")).toBe(true);
    expect(isQuickLogEffect("trocken")).toBe(false);
    expect(PRIVATE_QUICK_LOG_SIDE_EFFECTS.map((effect) => effect.value)).toContain("trocken");
    expect(QUICK_LOG_STATUSES.map((status) => status.value)).toEqual([
      "nochmal",
      "situativ",
      "nicht_nochmal",
    ]);
  });
});
