import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relative-time";

describe("formatRelativeTime", () => {
  it("uses singular German grammar for one day", () => {
    const now = new Date("2026-04-19T12:00:00.000Z");
    const yesterday = new Date("2026-04-18T12:00:00.000Z").toISOString();

    expect(formatRelativeTime(yesterday, now)).toBe("vor 1 Tag");
  });

  it("keeps plural German grammar for multiple days", () => {
    const now = new Date("2026-04-19T12:00:00.000Z");
    const twoDaysAgo = new Date("2026-04-17T12:00:00.000Z").toISOString();

    expect(formatRelativeTime(twoDaysAgo, now)).toBe("vor 2 Tagen");
  });
});
