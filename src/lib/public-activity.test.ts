import { describe, expect, it } from "vitest";
import {
  buildPublicQuickLogActivityPayload,
  buildPublicRatingActivityPayload,
} from "./public-activity";

describe("public activity payloads", () => {
  it("builds rating payloads without Tier-1 or private Tier-2 fields", () => {
    const payload = buildPublicRatingActivityPayload({
      rating: 4.3,
      strainSlug: "wedding-cake",
      reviewText: "Clear taste",
      organizationId: "org-1",
      memberId: "member-1",
      dose: "0.2g",
      batch: "ABC-123",
      pharmacy: "Private Apotheke",
      privateNotes: "Do not publish",
      legalAgeGroup: "adult",
      preventionNote: "Nur intern",
    } as any);

    expect(payload).toEqual({
      rating: 4.3,
      strain_slug: "wedding-cake",
      public_review_text: "Clear taste",
    });
    expect(Object.keys(payload)).toEqual(["rating", "strain_slug", "public_review_text"]);
    expect(JSON.stringify(payload)).not.toContain("0.2g");
    expect(JSON.stringify(payload)).not.toContain("ABC-123");
    expect(JSON.stringify(payload)).not.toContain("Private Apotheke");
    expect(JSON.stringify(payload)).not.toContain("Do not publish");
    expect(JSON.stringify(payload)).not.toContain("org-1");
    expect(JSON.stringify(payload)).not.toContain("member-1");
    expect(JSON.stringify(payload)).not.toContain("Nur intern");
  });

  it("builds quick log payloads without Tier-1 or private Tier-2 fields", () => {
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
      organizationId: "org-1",
      memberId: "member-1",
      preventionNote: "Nur intern",
    } as any);

    expect(payload).toEqual({
      rating: 4,
      strain_slug: "animal-mints",
      effect_chips: ["ruhe", "schlaf"],
      public_review_text: "Abends angenehm ruhig.",
    });
    expect(Object.keys(payload)).toEqual(["rating", "strain_slug", "effect_chips", "public_review_text"]);
    expect(JSON.stringify(payload)).not.toContain("trocken");
    expect(JSON.stringify(payload)).not.toContain("nicht_nochmal");
    expect(JSON.stringify(payload)).not.toContain("ABC-123");
    expect(JSON.stringify(payload)).not.toContain("Private Apotheke");
    expect(JSON.stringify(payload)).not.toContain("Sofa nach Arbeit");
    expect(JSON.stringify(payload)).not.toContain("org-1");
    expect(JSON.stringify(payload)).not.toContain("member-1");
    expect(JSON.stringify(payload)).not.toContain("Nur intern");
  });
});
