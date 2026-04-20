import { describe, expect, it } from "vitest";
import { mapDispensationError } from "./dispensation";

describe("mapDispensationError", () => {
  it.each([
    ["KCANG_DAILY_LIMIT_EXCEEDED: 25g/day", { code: "daily_limit", retryable: false }],
    ["KCANG_MONTHLY_LIMIT_EXCEEDED: 50g/month", { code: "monthly_limit", retryable: false }],
    ["KCANG_MEMBER_AGE_GROUP_MISSING", { code: "member_age_context_missing", retryable: false }],
  ])("maps %s to %o", (message, expected) => {
    expect(mapDispensationError(new Error(message))).toEqual(expected);
  });

  it("returns null for non-trigger errors", () => {
    expect(mapDispensationError(new Error("something else"))).toBeNull();
  });
});
