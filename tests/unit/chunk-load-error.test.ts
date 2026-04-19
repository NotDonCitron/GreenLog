import { describe, expect, it } from "vitest";
import { isChunkLoadError } from "@/lib/chunk-load-error";

describe("isChunkLoadError", () => {
  it("recognizes transient Next.js chunk loading failures", () => {
    expect(isChunkLoadError(new Error("Loading chunk 1153 failed."))).toBe(true);
    expect(isChunkLoadError(new Error("ChunkLoadError: Loading chunk app/page failed."))).toBe(true);
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module"))).toBe(true);
  });

  it("does not hide unrelated errors", () => {
    expect(isChunkLoadError(new Error("Database connection failed"))).toBe(false);
    expect(isChunkLoadError("plain string")).toBe(false);
  });
});
