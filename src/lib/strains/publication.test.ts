import { describe, expect, it } from "vitest";
import { getStrainPublicationSnapshot } from "./publication";

describe("getStrainPublicationSnapshot", () => {
  it("reports missing publish requirements for incomplete strains", () => {
    const snapshot = getStrainPublicationSnapshot({
      id: "strain-1",
      name: "Incomplete Dream",
      slug: "incomplete-dream",
      type: "hybrid",
      terpenes: ["Myrcene"],
      flavors: [],
      effects: [],
    });

    expect(snapshot.canPublish).toBe(false);
    expect(snapshot.missing).toEqual([
      "description",
      "thc",
      "cbd",
      "terpenes",
      "flavors",
      "effects",
      "image",
      "source",
    ]);
    expect(snapshot.qualityScore).toBeLessThan(100);
  });

  it("accepts complete strains as publishable", () => {
    const snapshot = getStrainPublicationSnapshot({
      id: "strain-2",
      name: "Canon Dream",
      slug: "canon-dream",
      type: "hybrid",
      description: "Dense flowers with a sweet citrus finish.",
      thc_min: 18,
      thc_max: 22,
      cbd_min: 0,
      cbd_max: 1,
      terpenes: ["Myrcene", "Limonene"],
      flavors: ["Citrus"],
      effects: ["Relaxed"],
      image_url: "https://cdn.example/strains-images/canon-dream.webp",
      canonical_image_path: "strains-images/canon-dream.webp",
      primary_source: "manual-curation",
    });

    expect(snapshot.canPublish).toBe(true);
    expect(snapshot.missing).toEqual([]);
    expect(snapshot.qualityScore).toBe(100);
  });

  it("returns a stable review payload for admin queues", () => {
    const snapshot = getStrainPublicationSnapshot({
      id: "strain-3",
      name: "Queue Dream",
      slug: "queue-dream",
      type: "indica",
      description: "Almost ready",
      thc_max: 24,
      cbd_max: 1,
      terpenes: ["Myrcene", "Limonene"],
      flavors: ["Berry"],
      effects: ["Sleepy"],
      image_url: "https://cdn.example/strains-images/queue-dream.webp",
      canonical_image_path: "strains-images/queue-dream.webp",
      primary_source: "leafly-curation",
    });

    expect(snapshot).toEqual({
      canPublish: true,
      missing: [],
      qualityScore: 100,
    });
  });

  it("requires canonical_image_path even when image_url exists", () => {
    const snapshot = getStrainPublicationSnapshot({
      name: "URL Only Kush",
      slug: "url-only-kush",
      type: "hybrid",
      description: "Looks complete but image path is missing",
      thc_max: 20,
      cbd_max: 1,
      terpenes: ["Myrcene", "Limonene"],
      flavors: ["Earthy"],
      effects: ["Calm"],
      image_url: "https://cdn.example/url-only-kush.webp",
      primary_source: "manual-curation",
    });

    expect(snapshot.canPublish).toBe(false);
    expect(snapshot.missing).toContain("image");
  });

  it("requires source notes for risky review-only sources", () => {
    const snapshot = getStrainPublicationSnapshot({
      name: "Risky Dream",
      slug: "risky-dream",
      type: "hybrid",
      description: "Looks complete but source is weak",
      thc_max: 20,
      cbd_max: 1,
      terpenes: ["Myrcene", "Limonene"],
      flavors: ["Earthy"],
      effects: ["Calm"],
      image_url: "https://cdn.example/risky-dream.webp",
      canonical_image_path: "strains-images/risky-dream.webp",
      primary_source: "askgrowers",
    });

    expect(snapshot.canPublish).toBe(false);
    expect(snapshot.missing).toContain("source");
  });

  it("accepts risky sources after manual review notes are added", () => {
    const snapshot = getStrainPublicationSnapshot({
      name: "Reviewed Dream",
      slug: "reviewed-dream",
      type: "hybrid",
      description: "Manually reviewed fallback image",
      thc_max: 20,
      cbd_max: 1,
      terpenes: ["Myrcene", "Limonene"],
      flavors: ["Earthy"],
      effects: ["Calm"],
      image_url: "https://cdn.example/reviewed-dream.webp",
      canonical_image_path: "strains-images/reviewed-dream.webp",
      primary_source: "askgrowers",
      source_notes: "Manuell geprüft, kein Stockfoto-Hinweis sichtbar.",
    });

    expect(snapshot.canPublish).toBe(true);
    expect(snapshot.missing).toEqual([]);
  });
});
