import { describe, expect, it } from "vitest";
import { getDefaultHarvestDate } from "./harvest-date";

describe("getDefaultHarvestDate", () => {
  it("formats today's date as an HTML date input value", () => {
    const today = new Date("2026-04-19T18:30:00.000Z");

    expect(getDefaultHarvestDate(today)).toBe("2026-04-19");
  });
});
