import { describe, expect, it } from "vitest";

import {
  buildMediaUrl,
  parseMediaPath,
  sanitizeObjectKey,
  storagePathFromMediaUrl,
} from "./media";

describe("media storage paths", () => {
  it("builds same-origin media URLs from bucket and object key", () => {
    expect(buildMediaUrl("strains", "abc/file.webp")).toBe("/media/strains/abc/file.webp");
  });

  it("normalizes duplicate slashes and rejects traversal", () => {
    expect(sanitizeObjectKey("/users//one/avatar.png")).toBe("users/one/avatar.png");
    expect(() => sanitizeObjectKey("../secret.png")).toThrow("Invalid object key");
    expect(() => sanitizeObjectKey("safe/../secret.png")).toThrow("Invalid object key");
  });

  it("parses only supported public media URLs", () => {
    expect(parseMediaPath(["avatars", "user-1", "photo.webp"])).toEqual({
      bucket: "avatars",
      key: "user-1/photo.webp",
    });
    expect(parseMediaPath(["grows", "user-1", "cover.webp"])).toEqual({
      bucket: "grows",
      key: "user-1/cover.webp",
    });
    expect(parseMediaPath(["grow-entry-photos", "user-1", "photo.webp"])).toBeNull();
  });

  it("extracts storage paths from same-origin media URLs", () => {
    expect(storagePathFromMediaUrl("/media/org-logos/org-1/logo.png")).toBe("org-logos/org-1/logo.png");
    expect(storagePathFromMediaUrl("https://example.com/media/strains/id.webp")).toBe("strains/id.webp");
    expect(storagePathFromMediaUrl("https://cdn.example.com/strains/id.webp")).toBeNull();
  });

  it("trims IMAGE_PUBLIC_BASE_PATH before building URLs", () => {
    const previous = process.env.IMAGE_PUBLIC_BASE_PATH;
    process.env.IMAGE_PUBLIC_BASE_PATH = " /media \n";
    try {
      expect(buildMediaUrl("strains", "abc.webp")).toBe("/media/strains/abc.webp");
      expect(storagePathFromMediaUrl("/media/strains/abc.webp")).toBe("strains/abc.webp");
    } finally {
      if (previous === undefined) {
        delete process.env.IMAGE_PUBLIC_BASE_PATH;
      } else {
        process.env.IMAGE_PUBLIC_BASE_PATH = previous;
      }
    }
  });
});
