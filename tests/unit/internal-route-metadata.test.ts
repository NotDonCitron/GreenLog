import { describe, expect, it } from "vitest";
import { metadata as communityMetadata } from "@/app/community/layout";
import { metadata as feedMetadata } from "@/app/feed/layout";

describe("internal route metadata", () => {
  it("marks community routes as noindex", () => {
    expect(communityMetadata.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });

  it("marks feed routes as noindex", () => {
    expect(feedMetadata.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });
});
