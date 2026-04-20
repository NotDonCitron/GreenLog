import { describe, expect, it } from "vitest";
import {
  buildPublicQuickLogActivityPayload,
  buildPublicRatingActivityPayload,
} from "./public-activity";

describe("public activity payloads", () => {
  it("builds rating payloads without private cannabis fields", () => {
    const payload = buildPublicRatingActivityPayload({
      rating: 4.3,
      strainSlug: "wedding-cake",
      reviewText: "Clear taste",
      dose: "0.2g",
      batch: "ABC-123",
      pharmacy: "Private Apotheke",
      privateNotes: "Do not publish",
    });

    expect(payload).toEqual({
      rating: 4.3,
      strain_slug: "wedding-cake",
      public_review_text: "Clear taste",
    });
    expect(JSON.stringify(payload)).not.toContain("0.2g");
    expect(JSON.stringify(payload)).not.toContain("ABC-123");
    expect(JSON.stringify(payload)).not.toContain("Private Apotheke");
    expect(JSON.stringify(payload)).not.toContain("Do not publish");
  });

  it("builds quick log payloads without private cannabis fields", () => {
    const payload = buildPublicQuickLogActivityPayload({
      rating: 4,
      strainSlug: "animal-mints",
      effectChips: ["ruhe", "schlaf", "trocken"],
      publicReviewText: "Abends angenehm ruhig.",
      sideEffects: ["trocken"],
      privateStatus: "nicht_nochmal",
      privateNote: "Avoid after work",
      dose: "0.4g",
      batch: "ABC-123",
      pharmacy: "Private Apotheke",
      setting: "Sofa nach Arbeit",
    });

    expect(payload).toEqual({
      rating: 4,
      strain_slug: "animal-mints",
      effect_chips: ["ruhe", "schlaf"],
      public_review_text: "Abends angenehm ruhig.",
    });
    expect(JSON.stringify(payload)).not.toContain("trocken");
    expect(JSON.stringify(payload)).not.toContain("nicht_nochmal");
    expect(JSON.stringify(payload)).not.toContain("ABC-123");
  });
});
