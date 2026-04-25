import { describe, expect, it, afterEach } from "vitest";
import { resolvePublicMediaUrl } from "./public-media-url";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  }
});

describe("resolvePublicMediaUrl", () => {
  it("resolves public media paths against the configured public site origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://green-log-two.vercel.app/app";

    expect(resolvePublicMediaUrl("/media/strains/blue-dream.jpg")).toBe(
      "https://green-log-two.vercel.app/media/strains/blue-dream.jpg",
    );
  });

  it("leaves non-media values unchanged", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://green-log-two.vercel.app";

    expect(resolvePublicMediaUrl("/strains/placeholder-1.svg")).toBe("/strains/placeholder-1.svg");
    expect(resolvePublicMediaUrl("https://storage.cannalog.fun/media/strains/a.jpg")).toBe(
      "https://storage.cannalog.fun/media/strains/a.jpg",
    );
  });

  it("falls back to the original media path without a valid public origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "not a url";

    expect(resolvePublicMediaUrl("/media/avatars/user.jpg")).toBe("/media/avatars/user.jpg");
  });
});
