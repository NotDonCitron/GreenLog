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
  it("resolves public media paths against the public storage origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://green-log-two.vercel.app/app";

    expect(resolvePublicMediaUrl("/media/strains/blue-dream.jpg")).toBe(
      "https://storage.cannalog.fun/strains/blue-dream.jpg",
    );
  });

  it("leaves non-media values unchanged", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://green-log-two.vercel.app";

    expect(resolvePublicMediaUrl("/strains/placeholder-1.svg")).toBe("/strains/placeholder-1.svg");
    expect(resolvePublicMediaUrl("https://storage.cannalog.fun/media/strains/a.jpg")).toBe(
      "https://storage.cannalog.fun/media/strains/a.jpg",
    );
  });

  it("does not depend on a valid public site origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "not a url";

    expect(resolvePublicMediaUrl("/media/avatars/user.jpg")).toBe(
      "https://storage.cannalog.fun/avatars/user.jpg",
    );
  });

  it("does not depend on a configured public site origin", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    expect(resolvePublicMediaUrl("/media/org-logos/logo.jpg")).toBe(
      "https://storage.cannalog.fun/org-logos/logo.jpg",
    );
  });

  it("resolves S3 object keys from grow-entry-photos (user_id/grow_id/file.ext)", () => {
    expect(resolvePublicMediaUrl("a7a6b350-b35c-4c67-9abb-ea73f0f05b50/3d9e473a-fa25-42f5-a3cd-67a45321bd89/5bd3c3f9-06a2-4355-bd90-cb15421e1547.png")).toBe(
      "https://storage.cannalog.fun/grow-entry-photos/a7a6b350-b35c-4c67-9abb-ea73f0f05b50/3d9e473a-fa25-42f5-a3cd-67a45321bd89/5bd3c3f9-06a2-4355-bd90-cb15421e1547.png",
    );
  });

  it("does not misdetect short non-UUID paths as S3 keys", () => {
    expect(resolvePublicMediaUrl("some/random/path")).toBe("some/random/path");
  });
});
